import type { AppData } from "./types";
import { importRoutines, type RoutineTemplate } from "./routine-import";

/** Gym routines that come pre-loaded with the app. */
export const DEFAULT_ROUTINES: RoutineTemplate[] = [
  {
    "name": "Gym",
    "days": [
      {
        "name": "Espalda y brazo",
        "exercises": [
          {
            "name": "Bici",
            "measure": "time",
            "targetSets": 1,
            "targetReps": null,
            "targetWeight": null
          },
          {
            "name": "Remo sentado",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 12,
            "targetWeight": 40
          },
          {
            "name": "Tirones al pecho",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 10,
            "targetWeight": 45
          },
          {
            "name": "Remo a un brazo",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 8,
            "targetWeight": 12.5
          },
          {
            "name": "Pullover acostado",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 10,
            "targetWeight": 15
          },
          {
            "name": "Bíceps con barra W",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 15,
            "targetWeight": 20
          },
          {
            "name": "Bíceps martillo (7 o 10 kg)",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 10,
            "targetWeight": 7
          },
          {
            "name": "Tríceps soga",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 10,
            "targetWeight": 30
          },
          {
            "name": "Abdominales",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": null,
            "targetWeight": null
          }
        ]
      },
      {
        "name": "Pecho",
        "exercises": [
          {
            "name": "Bici",
            "measure": "time",
            "targetSets": 1,
            "targetReps": null,
            "targetWeight": null
          },
          {
            "name": "Apertura en plano (disco grande)",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 15,
            "targetWeight": 10
          },
          {
            "name": "Banco plano (kg por lado)",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 10,
            "targetWeight": 20
          },
          {
            "name": "Banco inclinado Smith (kg por lado)",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 10,
            "targetWeight": 20
          },
          {
            "name": "Pullover acostado",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 12,
            "targetWeight": 20
          },
          {
            "name": "Abdominales",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": null,
            "targetWeight": null
          }
        ]
      },
      {
        "name": "Piernas (sin flexión profunda)",
        "exercises": [
          {
            "name": "Bici",
            "measure": "time",
            "targetSets": 1,
            "targetReps": null,
            "targetWeight": null
          },
          {
            "name": "Sillón de cuádriceps (medio recorrido, 35–40 kg)",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 12,
            "targetWeight": 35
          },
          {
            "name": "Prensa 45° (rango corto)",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 12,
            "targetWeight": 140
          },
          {
            "name": "Sillón de isquios (40–50 kg)",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": 12,
            "targetWeight": 40
          },
          {
            "name": "Peso muerto rumano (60–80 kg)",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 10,
            "targetWeight": 60
          },
          {
            "name": "Gemelos (60–80 kg)",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 15,
            "targetWeight": 60
          },
          {
            "name": "Abdominales",
            "measure": "reps_weight",
            "targetSets": 3,
            "targetReps": null,
            "targetWeight": null
          },
          {
            "name": "Hip thrust con barra (60–80 kg)",
            "measure": "reps_weight",
            "targetSets": 4,
            "targetReps": 12,
            "targetWeight": 60
          }
        ]
      }
    ]
  }
];

/** Adds the default routines once. Never re-adds them if the user deleted them. */
export function withDefaultRoutines(data: AppData): AppData {
  if (data.settings.defaultRoutinesAdded) return data;
  const next = importRoutines(data, DEFAULT_ROUTINES);
  return { ...next, settings: { ...next.settings, defaultRoutinesAdded: true } };
}
