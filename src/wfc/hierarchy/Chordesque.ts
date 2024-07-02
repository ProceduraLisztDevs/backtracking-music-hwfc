import { InfiniteArray } from "../InfiniteArray"
import { LengthStrategy, MusicalKeyType } from "../../components/GlobalSettings"
import { RhythmStrategy } from "../../components/RhythmSettings"
import {
	Chord,
	ChordIR,
	ChordQuality,
	chordIRToString,
	isChordIR,
} from "../../music_theory/Chord"
import { MusicalKey } from "../../music_theory/MusicalKey"
import { Note, OctavedNote, OctavedNoteIR } from "../../music_theory/Note"
import { RhythmPatternOptions } from "../../music_theory/Rhythm"
import { ConstraintSet } from "../ConstraintSet"
import { OptionsPerCell } from "../OptionsPerCell"
import { TileCanvasProps } from "../TileCanvas"
import {
	NoteConstraintIR,
	convertIRToNoteConstraint,
} from "../constraints/constraintUtils"
import { Canvasable, Name } from "../../util/utils"
import { Section } from "./Section"

export interface Chordesque extends Canvasable<Chordesque> {
	getName(): string
	getChord: () => Chord
	getBpm: (section: Section) => number
}

export type ChordesqueIR = ChordIR | string
export class ChordPrototype implements Chordesque {
	constructor(
		public readonly name: string,
		public readonly noteCanvasProps: TileCanvasProps<OctavedNote>,
		private readonly chord: Chord,
		public readonly rhythmStrategy: RhythmStrategy,
		public readonly rhythmPatternOptions: RhythmPatternOptions,
		public readonly melodyLength: number,
		public readonly useDifferentMelodyKey: boolean,
		public readonly melodyKey: MusicalKey,
		public readonly melodyLengthStrategy: LengthStrategy,
		public readonly bpmStrategy: LengthStrategy,
		public readonly bpm: number,

	) {}

	getChord(): Chord {
		return this.chord;
	}

	getName(): string {
		return this.name;
	}

	getBpm(section: Section) {
		return this.bpm;
	}

	equals(other: any): boolean {
		if(!(other instanceof ChordPrototype)) return false
		return (this.chord.equals(other.chord) && this.name == other.name)
	}

	clone(): Chordesque {
		return new ChordPrototype(this.name, this.noteCanvasProps, this.chord, this.rhythmStrategy,
			 this.rhythmPatternOptions, this.melodyLength, this.useDifferentMelodyKey, this.melodyKey,
			  this.melodyLengthStrategy, this.bpmStrategy, this.bpm)
	}
}

export const ChordPrototypeInit = (id: number) => {
	return {
		name: "",
		id: id,
		noteCanvasProps: {
			size: 4,
			optionsPerCell: new InfiniteArray<OctavedNoteIR[]>(),
			constraints: [] as NoteConstraintIR[],
		},
		chord: {
			root: Note.C,
			quality: "major" as ChordQuality,
		},
		allowedPrecedingChords: [] as string[],
		allowedFollowingChords: [] as string[],
		restrictPrecedingChords: false,
		restrictFollowingChords: false,
		rhythmStrategy: "Inherit" as RhythmStrategy,
		melodyLengthStrategy: "Inherit" as LengthStrategy,
		melodyLength: 4,
		bpmStrategy: "Inherit" as LengthStrategy,
		bpm: 120,
		rhythmPatternOptions: {
			onlyStartOnNote: true,
			minimumNumberOfNotes: 3,
			maximumRestLength: 1,
		} as RhythmPatternOptions,
		useDifferentMelodyKey: false,
		melodyKeyRoot: Note.C,
		melodyKeyType: "major" as MusicalKeyType,
	}
}

export type ChordPrototypeIR = ReturnType<typeof ChordPrototypeInit>

export function nameOfChordPrototypeIR(protoIR: ChordPrototypeIR): Name {
	return new Name(protoIR.name === "" ? `ChordPrototype${protoIR.id}` : protoIR.name)
} 

export function chordPrototypeIRToChordPrototype(
	protoIR: ChordPrototypeIR,
): ChordPrototype {
	const noteCanvasProps: TileCanvasProps<OctavedNote> = {
		optionsPerCell: new OptionsPerCell(
			OctavedNote.all(),
			protoIR.noteCanvasProps.optionsPerCell.transform(OctavedNote.multipleFromIRs),
		),
		constraints: new ConstraintSet(
			protoIR.noteCanvasProps.constraints.map((noteConstraint) =>
				convertIRToNoteConstraint(noteConstraint),
			),
		),
	}
	return new ChordPrototype(
		protoIR.name,
		noteCanvasProps,
		Chord.fromIR(protoIR.chord),
		protoIR.rhythmStrategy,
		protoIR.rhythmPatternOptions,
		protoIR.melodyLength,
		protoIR.useDifferentMelodyKey,
		MusicalKey.fromRootAndType(
			protoIR.melodyKeyRoot,
			protoIR.melodyKeyType,
		),
		protoIR.melodyLengthStrategy,
		protoIR.bpmStrategy,
		protoIR.bpm,
	)
}

export function chordesqueIRMapToChordesqueMap(
	chordesqueIRMap: InfiniteArray<ChordesqueIR[]>,
	chordPrototypes: ChordPrototypeIR[],
): InfiniteArray<Chordesque[]> {
	const chordesqueMap = new InfiniteArray<Chordesque[]>()

	for (const [position, chordesqueIRs] of chordesqueIRMap.entries()) {
		const chordesqueList: Chordesque[] = chordesqueIRs.map(
			(chordesqueIR) => {
				if (isChordIR(chordesqueIR)) {
					return Chord.fromIR(chordesqueIR)
				} else {
					const proto = chordPrototypes.find(
						(proto) => nameOfChordPrototypeIR(proto).name == chordesqueIR,
					)
					if (proto === undefined)
						throw new Error(
							`Chord prototype ${chordesqueIR} not found`,
						)
					return chordPrototypeIRToChordPrototype(proto)
				}
			},
		)
		chordesqueMap.set(position, chordesqueList)
	}
	return chordesqueMap
}

export function chordesqueIRToString(chordesqueIR: ChordesqueIR): string {
	if (typeof chordesqueIR === "string") {
		return chordesqueIR
	} else {
		return chordIRToString(chordesqueIR)
	}
}
