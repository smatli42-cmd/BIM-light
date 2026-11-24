// Společný základ souboru IFC: jednotky (mm), geometrický kontext a pomocníci pro body a umístění.
import { int, str, en, DERIVED, type Arg, type Raw, type StepWriter } from './step.ts';

export interface IfcContext {
  readonly w: StepWriter;
  /** Podkontext „Body“ (3D tělo) a „Axis“ (osa stěny). */
  readonly body: Raw;
  readonly axis: Raw;
  readonly units: Raw;
  readonly model: Raw;
  /** Počátek a osy, sdílené všemi umístěními bez natočení. */
  readonly origin: Raw;
}

export const point2 = (w: StepWriter, x: number, y: number): Raw => w.add('IfcCartesianPoint', [[x, y]]);
export const point3 = (w: StepWriter, x: number, y: number, z: number): Raw =>
  w.add('IfcCartesianPoint', [[x, y, z]]);
export const dir3 = (w: StepWriter, x: number, y: number, z: number): Raw =>
  w.add('IfcDirection', [[x, y, z]]);

/** Umístění v rodičovském umístění: posun (x, y, z) a natočení osy X ve vodorovné rovině. */
export function placement(
  c: Pick<IfcContext, 'w'>,
  parent: Raw | null,
  at: { x: number; y: number; z: number },
  dirX?: { x: number; y: number },
): Raw {
  const { w } = c;
  const loc = point3(w, at.x, at.y, at.z);
  const axes: Arg[] = dirX ? [dir3(w, 0, 0, 1), dir3(w, dirX.x, dirX.y, 0)] : [null, null];
  const rel = w.add('IfcAxis2Placement3D', [loc, ...axes]);
  return w.add('IfcLocalPlacement', [parent, rel]);
}

function units(w: StepWriter): Raw {
  const si = (type: string, prefix: string | null, name: string) =>
    w.add('IfcSIUnit', [DERIVED, en(type), prefix ? en(prefix) : null, en(name)]);
  return w.add('IfcUnitAssignment', [
    [
      si('LENGTHUNIT', 'MILLI', 'METRE'),
      si('AREAUNIT', null, 'SQUARE_METRE'),
      si('VOLUMEUNIT', null, 'CUBIC_METRE'),
      si('PLANEANGLEUNIT', null, 'RADIAN'),
    ],
  ]);
}

/** Založí jednotky a kontexty reprezentace (3D model, podkontexty Body a Axis). */
export function createContext(w: StepWriter): IfcContext {
  const origin = w.add('IfcAxis2Placement3D', [point3(w, 0, 0, 0), null, null]);
  const north = w.add('IfcDirection', [[0, 1]]);
  const model = w.add('IfcGeometricRepresentationContext', [null, str('Model'), int(3), 1e-5, origin, north]);
  const sub = (id: string, type: string, view: string) =>
    w.add('IfcGeometricRepresentationSubContext', [
      str(id),
      str(type),
      DERIVED,
      DERIVED,
      DERIVED,
      DERIVED,
      model,
      null,
      en(view),
      null,
    ]);
  return {
    w,
    model,
    origin,
    units: units(w),
    body: sub('Body', 'Model', 'MODEL_VIEW'),
    axis: sub('Axis', 'Model', 'GRAPH_VIEW'),
  };
}
