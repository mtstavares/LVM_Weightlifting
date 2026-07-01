import { describe, expect, it } from 'vitest';
import { exerciseCatalog, getExerciseConfigByKey, prBaseLabel } from './exercise-catalog';

describe('exercise catalog', () => {
  it('maps derived exercises to explicit PR bases', () => {
    expect(getExerciseConfigByKey('HANG_SNATCH')).toMatchObject({
      prBase: 'SNATCH',
      canUpdatePersonalRecord: false
    });
    expect(getExerciseConfigByKey('CLEAN_PULL')).toMatchObject({
      prBase: 'CLEAN_JERK',
      canUpdatePersonalRecord: false
    });
    expect(getExerciseConfigByKey('RDL')).toMatchObject({
      prBase: 'DEADLIFT',
      canUpdatePersonalRecord: false
    });
  });

  it('allows only main lifts to update personal records', () => {
    expect(getExerciseConfigByKey('SNATCH')).toMatchObject({
      prBase: 'SNATCH',
      canUpdatePersonalRecord: true
    });
    expect(getExerciseConfigByKey('CLEAN_JERK')).toMatchObject({
      prBase: 'CLEAN_JERK',
      canUpdatePersonalRecord: true
    });
    expect(getExerciseConfigByKey('SNATCH_BALANCE')).toMatchObject({
      prBase: 'SNATCH',
      canUpdatePersonalRecord: false
    });
  });

  it('labels NONE and configured PR bases', () => {
    expect(exerciseCatalog.length).toBeGreaterThan(30);
    expect(prBaseLabel('NONE')).toBe('Sem PR base');
    expect(prBaseLabel('BACK_SQUAT')).toBe('Back Squat');
    expect(getExerciseConfigByKey('UNKNOWN')).toBeNull();
  });
});
