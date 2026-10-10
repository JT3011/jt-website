-- Additive storage: existing single-choice plates and rewards remain compatible.
CREATE TABLE public.player_nutrition_plate_selections (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plate_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  scenario text NOT NULL CHECK (scenario IN ('everyday_meal','pre_training','post_training','matchday_meal','recovery_day')),
  food_choices jsonb NOT NULL DEFAULT '{"protein":[],"carbohydrate":[],"fat":[],"fruit":[],"vegetable":[],"hydration":[]}'::jsonb,
  takeaway_choices text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plate_date, scenario),
  CONSTRAINT nutrition_food_choices_valid CHECK (
    jsonb_typeof(food_choices) = 'object'
    AND food_choices ?& ARRAY['protein','carbohydrate','fat','fruit','vegetable','hydration']::text[]
    AND food_choices <@ '{"protein":["chicken","turkey","lean_beef","salmon","tuna","eggs","greek_yoghurt","beans","tofu"],"carbohydrate":["rice","pasta","potatoes","bread","oats","couscous","cereal"],"fat":["avocado","olive_oil","nuts","seeds","peanut_butter","cheese"],"fruit":["banana","berries","apple","orange","grapes","mango"],"vegetable":["broccoli","spinach","peppers","carrots","peas","mixed_salad"],"hydration":["water","milk","electrolyte_drink","diluted_juice"]}'::jsonb
    AND jsonb_typeof(food_choices->'protein') = 'array' AND jsonb_typeof(food_choices->'carbohydrate') = 'array' AND jsonb_typeof(food_choices->'fat') = 'array' AND jsonb_typeof(food_choices->'fruit') = 'array' AND jsonb_typeof(food_choices->'vegetable') = 'array' AND jsonb_typeof(food_choices->'hydration') = 'array'
    AND octet_length(food_choices::text) <= 4096
  ),
  CONSTRAINT nutrition_takeaway_choices_valid CHECK (
    takeaway_choices <@ ARRAY['mcdonalds_burger','mcdonalds_chicken','mcdonalds_fries','kfc_chicken','kfc_burger','kfc_fries','indian_curry','indian_dal','indian_rice','indian_naan','chinese_stir_fry','chinese_rice','chinese_noodles','chinese_sweet_sour','other_pizza','other_fish_chips','other_kebab','other_other']::text[]
    AND array_position(takeaway_choices, NULL) IS NULL
    AND cardinality(takeaway_choices) <= 18
  )
);
ALTER TABLE public.player_nutrition_plate_selections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_nutrition_plate_selections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_nutrition_plate_selections TO authenticated;
CREATE POLICY nutrition_selections_select_own ON public.player_nutrition_plate_selections FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_selections_insert_own ON public.player_nutrition_plate_selections FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_selections_update_own ON public.player_nutrition_plate_selections FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE TRIGGER enforce_premium_hub_write BEFORE INSERT OR UPDATE ON public.player_nutrition_plate_selections FOR EACH ROW EXECUTE FUNCTION public.enforce_performance_hub_premium_write();
CREATE TRIGGER set_nutrition_selections_updated_at BEFORE UPDATE ON public.player_nutrition_plate_selections FOR EACH ROW EXECUTE FUNCTION public.update_player_nutrition_plate_timestamp();

CREATE FUNCTION public.save_nutrition_plate_v2(selected_scenario text, selected_foods jsonb, selected_takeaways text[] DEFAULT '{}'::text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  player_id uuid := auth.uid();
  today_utc date := (timezone('utc', now()))::date;
  allowed_foods constant jsonb := '{"protein":["chicken","turkey","lean_beef","salmon","tuna","eggs","greek_yoghurt","beans","tofu"],"carbohydrate":["rice","pasta","potatoes","bread","oats","couscous","cereal"],"fat":["avocado","olive_oil","nuts","seeds","peanut_butter","cheese"],"fruit":["banana","berries","apple","orange","grapes","mango"],"vegetable":["broccoli","spinach","peppers","carrots","peas","mixed_salad"],"hydration":["water","milk","electrolyte_drink","diluted_juice"]}'::jsonb;
  category text;
  choices jsonb;
  normalised_foods jsonb := '{}'::jsonb;
  normalised_takeaways text[];
  complete_plate boolean := true;
  reward_result jsonb;
BEGIN
  IF player_id IS NULL THEN RAISE EXCEPTION 'Please sign in to save your choices.' USING ERRCODE = '42501'; END IF;
  IF selected_scenario IS NULL OR selected_scenario NOT IN ('everyday_meal','pre_training','post_training','matchday_meal','recovery_day') THEN
    RAISE EXCEPTION 'Choose a valid meal scenario.' USING ERRCODE = '22023';
  END IF;
  IF selected_foods IS NULL OR jsonb_typeof(selected_foods) <> 'object' OR NOT (selected_foods ?& ARRAY['protein','carbohydrate','fat','fruit','vegetable','hydration']::text[]) OR NOT (selected_foods <@ allowed_foods) OR octet_length(selected_foods::text) > 4096 THEN
    RAISE EXCEPTION 'Food selections are not valid.' USING ERRCODE = '22023';
  END IF;
  FOR category IN SELECT jsonb_object_keys(allowed_foods) LOOP
    choices := selected_foods->category;
    IF jsonb_typeof(choices) <> 'array' THEN RAISE EXCEPTION 'Choose foods as a list.' USING ERRCODE = '22023'; END IF;
    SELECT coalesce(jsonb_agg(value ORDER BY first_position), '[]'::jsonb) INTO choices
    FROM (SELECT value, min(ordinality) AS first_position FROM jsonb_array_elements(choices) WITH ORDINALITY GROUP BY value) deduplicated;
    normalised_foods := normalised_foods || jsonb_build_object(category, choices);
    IF jsonb_array_length(choices) = 0 THEN complete_plate := false; END IF;
  END LOOP;
  IF selected_takeaways IS NULL OR NOT (selected_takeaways <@ ARRAY['mcdonalds_burger','mcdonalds_chicken','mcdonalds_fries','kfc_chicken','kfc_burger','kfc_fries','indian_curry','indian_dal','indian_rice','indian_naan','chinese_stir_fry','chinese_rice','chinese_noodles','chinese_sweet_sour','other_pizza','other_fish_chips','other_kebab','other_other']::text[]) OR array_position(selected_takeaways,NULL) IS NOT NULL OR cardinality(selected_takeaways) > 18 THEN
    RAISE EXCEPTION 'Takeaway selections are not valid.' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(array_agg(value ORDER BY first_position), '{}'::text[]) INTO normalised_takeaways
  FROM (SELECT value, min(ordinality) AS first_position FROM unnest(selected_takeaways) WITH ORDINALITY AS t(value,ordinality) GROUP BY value) deduplicated;

  -- Serialise v2 submissions for this player; all writes and rewards are atomic.
  PERFORM pg_advisory_xact_lock(hashtextextended('nutrition_plate:' || player_id::text, 0));
  INSERT INTO public.player_nutrition_plate_selections (user_id, plate_date, scenario, food_choices, takeaway_choices)
  VALUES (player_id, today_utc, selected_scenario, normalised_foods, normalised_takeaways)
  ON CONFLICT (user_id,plate_date,scenario) DO UPDATE SET food_choices=EXCLUDED.food_choices, takeaway_choices=EXCLUDED.takeaway_choices;

  IF complete_plate THEN
    -- Existing server function remains the sole authority for points and limits.
    SELECT to_jsonb(reward) INTO reward_result FROM public.save_nutrition_plate(
      selected_scenario, normalised_foods->'protein'->>0, normalised_foods->'carbohydrate'->>0,
      normalised_foods->'fat'->>0, normalised_foods->'fruit'->>0,
      normalised_foods->'vegetable'->>0, normalised_foods->'hydration'->>0
    ) reward;
  END IF;
  RETURN coalesce(reward_result, jsonb_build_object('saved',true,'saved_plate_date',today_utc,'saved_scenario',selected_scenario,'points_awarded',0))
    || jsonb_build_object('plate_complete',complete_plate);
END;
$function$;
REVOKE ALL ON FUNCTION public.save_nutrition_plate_v2(text,jsonb,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_nutrition_plate_v2(text,jsonb,text[]) TO authenticated;
COMMENT ON TABLE public.player_nutrition_plate_selections IS 'Private daily meal choices, including multiple foods and optional takeaway items. Score counts categories, not quantities. Existing nutrition reward rules are unchanged.';
