import { ConcreteChordQuality } from "../../../music_theory/Chord"
import { MusicalKey } from "../../../music_theory/MusicalKey"
import { Grabber } from "../../Grabber"
import { constantConcreteChordQualityGrabber, constantNumberGrabber } from "../../grabbers/constantGrabbers"
import { chordConstraintTypeToName } from "../constraintUtils"
import { GenericCadenceSoftConstraint } from "./GenericCadenceSoftConstraint"

export const PlagalCadenceSoftConstraintInit = {
	type: "PlagalCadenceSoftConstraint" as const,
	bonus: 1,
	validByDefault: true as const,
	reachOverPrev: true,
	reachOverNext: true
}

export type PlagalCadenceSoftConstraintIR =
	typeof PlagalCadenceSoftConstraintInit
export class PlagalCadenceSoftConstraint extends GenericCadenceSoftConstraint {
	name = chordConstraintTypeToName.get(
		PlagalCadenceSoftConstraintInit.type,
	)!.name as string
	constructor(bonus: number, keyGrabber: Grabber<MusicalKey>, reachOverPrev: boolean, reachOverNext: boolean) {
		super(
			bonus,
			constantNumberGrabber(5),
			constantNumberGrabber(0),
			constantConcreteChordQualityGrabber("major" as ConcreteChordQuality),
			constantConcreteChordQualityGrabber("major" as ConcreteChordQuality),
			keyGrabber,
			reachOverPrev,
			reachOverNext
		)
	}
}
