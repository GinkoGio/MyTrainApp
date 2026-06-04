export interface SetDefinition {
  reps: number;
  weight: number;
}

export interface PlannedExercise {
  id: string;
  name: string;
  sets: SetDefinition[];
  restSeconds: number;
}

export interface TrainingDay {
  id: string;
  week: number;
  day: number;
  label?: string;
  exercises: PlannedExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  days: TrainingDay[];
  createdAt: string;
}

export interface PerformedSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface PerformedExercise {
  exerciseId: string;
  name: string;
  restSeconds: number;
  sets: PerformedSet[];
}

export interface SessionLog {
  id: string;
  planId: string;
  planName: string;
  dayId: string;
  week: number;
  day: number;
  date: string;
  exercises: PerformedExercise[];
  completed: boolean;
}
