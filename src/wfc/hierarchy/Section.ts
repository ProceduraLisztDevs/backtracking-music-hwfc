import { InfiniteArray } from "../InfiniteArray"
import { LengthStrategy, MusicalKeyType } from "../../components/GlobalSettings"
import { RhythmStrategy } from "../../components/RhythmSettings"
import { Chord } from "../../music_theory/Chord"
import { MusicalKey } from "../../music_theory/MusicalKey"
import { Note, OctavedNote, OctavedNoteIR } from "../../music_theory/Note"
import { RhythmPatternOptions } from "../../music_theory/Rhythm"
import { ConstraintSet } from "../ConstraintSet"
import { OptionsPerCell } from "../OptionsPerCell"
import { TileCanvasProps } from "../TileCanvas"
import { ChordConstraintIR, NoteConstraintIR, convertIRToChordConstraint, convertIRToNoteConstraint } from "../constraints/constraintUtils"
import { ChordPrototypeIR, Chordesque, ChordesqueIR, chordesqueIRMapToChordesqueMap } from "./Chordesque"
import { parseChordPrototypes } from "../../components/Output"
import { Canvasable, Name } from "../../util/utils"

export interface SectionProps{
    name: string
    noteCanvasProps: TileCanvasProps<OctavedNote>
    chordesqueCanvasProps: TileCanvasProps<Chordesque>
    rhythmPatternOptions: RhythmPatternOptions
    melodyLength: number
    melodyLengthStrategy: LengthStrategy
    rhythmStrategy: RhythmStrategy
    useDifferentMelodyKey: boolean
    melodyKey: MusicalKey
    numChordsStrategy: LengthStrategy
    numChords: number
    bpmStrategy: LengthStrategy
    bpm: number
}

export class Section implements Canvasable<Section> {
    constructor(
        private name: string, 
        private noteCanvasProps: TileCanvasProps<OctavedNote>, 
        private chordesqueCanvasProps: TileCanvasProps<Chordesque>, 
        private rhythmPatternOptions: RhythmPatternOptions, 
        private melodyLength: number, 
        private melodyLengthStrategy: LengthStrategy,
        private rhythmStrategy: RhythmStrategy,
        private useDifferentMelodyKey: boolean,
        private melodyKey: MusicalKey,
        private numChordsStrategy: LengthStrategy,
        private numChords: number,
        private bpmStrategy: LengthStrategy,
        private bpm: number
    ) {}

    equals(other: any): boolean {
        if(!(other instanceof Section)) return false
        return this.name == other.name
    }

    public getName(): string {
        return this.name
    }

    public getObj(): SectionProps {
        return {
            name: this.name,
            noteCanvasProps: this.noteCanvasProps,
            chordesqueCanvasProps: this.chordesqueCanvasProps,
            rhythmPatternOptions: this.rhythmPatternOptions,
            melodyLength: this.melodyLength,
            melodyLengthStrategy: this.melodyLengthStrategy,
            rhythmStrategy: this.rhythmStrategy,
            useDifferentMelodyKey: this.useDifferentMelodyKey,
            melodyKey: this.melodyKey,
            numChords: this.numChords,
            numChordsStrategy: this.numChordsStrategy,
            bpm: this.bpm,
            bpmStrategy: this.bpmStrategy
        }
    }

    clone(): Section {
        return new Section(this.name, this.noteCanvasProps, this.chordesqueCanvasProps,
             this.rhythmPatternOptions, this.melodyLength, this.melodyLengthStrategy, 
             this.rhythmStrategy, this.useDifferentMelodyKey, this.melodyKey, this.numChordsStrategy,
             this.numChords, this.bpmStrategy, this.bpm)
    }
}

export const SectionInit = (id: number) => {
    return {
		name: "",
		id: id,
		noteCanvasProps: {
			size: 4,
			optionsPerCell: new InfiniteArray<OctavedNoteIR[]>(),
			constraints: [] as NoteConstraintIR[],
		},
		chordesqueCanvasProps: {
			size: 4,
			optionsPerCell: new InfiniteArray<ChordesqueIR[]>(),
			constraints: [] as ChordConstraintIR[],
		},
		allowedPrecedingSections: [] as string[],
		allowedFollowingSections: [] as string[],
		restrictPrecedingSections: false,
		restrictFollowingSections: false,
		rhythmStrategy: "Inherit" as RhythmStrategy,
		melodyLengthStrategy: "Inherit" as LengthStrategy,
		melodyLength: 4,
        numChordsStrategy: "Inherit" as LengthStrategy,
        numChords: 4,
        bpmStrategy: "Inherit" as LengthStrategy,
        bpm: 120,
		rhythmPatternOptions: {
			onlyStartOnNote: true,
			minimumNumberOfNotes: 3,
			maximumRestLength: 1,
		} as RhythmPatternOptions,
        useDifferentKey: false,
        keyRoot: Note.C,
        keyType: "major" as MusicalKeyType,
		useDifferentMelodyKey: false,
		melodyKeyRoot: Note.C,
		melodyKeyType: "major" as MusicalKeyType,
	}
}

export type SectionIR = ReturnType<typeof SectionInit>

export function nameOfSectionIR(sectionIR: SectionIR): Name {
    return new Name(sectionIR.name === "" ? `Section${sectionIR.id}` : sectionIR.name)
}

export function sectionIRToSection(
    sectionIR: SectionIR,
    chordPrototypes: ChordPrototypeIR[],
    onlyUseChordPrototypes: boolean,
): Section {
    const noteCanvasProps: TileCanvasProps<OctavedNote> = {
        optionsPerCell: new OptionsPerCell(
            OctavedNote.all(),
            sectionIR.noteCanvasProps.optionsPerCell.transform(OctavedNote.multipleFromIRs),
        ),
        constraints: new ConstraintSet(
            sectionIR.noteCanvasProps.constraints.map((noteConstraint) =>
                convertIRToNoteConstraint(noteConstraint)
            )
        )
        }
    const {parsedChordPrototypes} = parseChordPrototypes(chordPrototypes)
    const chordesqueCanvasProps : TileCanvasProps<Chordesque> = {
        optionsPerCell: new OptionsPerCell([
            ...parsedChordPrototypes,
            ...(onlyUseChordPrototypes ? [] : Chord.allBasicChords()),
        ],
            chordesqueIRMapToChordesqueMap(sectionIR.chordesqueCanvasProps.optionsPerCell, chordPrototypes)
        ),
        constraints: new ConstraintSet(
            sectionIR.chordesqueCanvasProps.constraints.map((chordConstraint) =>
                convertIRToChordConstraint(chordConstraint)
            )
        )
        }

    return new Section(
        sectionIR.name,
        noteCanvasProps,
        chordesqueCanvasProps,
        sectionIR.rhythmPatternOptions,
        sectionIR.melodyLength,
        sectionIR.melodyLengthStrategy,
        sectionIR.rhythmStrategy,
        sectionIR.useDifferentMelodyKey,
        MusicalKey.fromRootAndType(
            sectionIR.melodyKeyRoot,
            sectionIR.melodyKeyType,
        ),
        sectionIR.numChordsStrategy,
        sectionIR.numChords,
        sectionIR.bpmStrategy,
        sectionIR.bpm
    )
}

export function sectionIRMapToSectionMap(
	sectionIRMap: InfiniteArray<SectionIR[]>,
    sections: SectionIR[],
	chordPrototypes: ChordPrototypeIR[],
    onlyUseChordPrototypes: boolean,
): InfiniteArray<Section[]> {
	const sectionMap = new InfiniteArray<Section[]>()

	for (const [position, sectionIRs] of sectionIRMap.entries()) {
		const sectionList: Section[] = sectionIRs.map(
			(sectionIR) => {
                const section = sections.find(
                    (section) => section.id === sectionIR.id,
                )
                if (section === undefined)
                    throw new Error(
                        `Section ${nameOfSectionIR(sectionIR).name} not found`,
                    )
                return sectionIRToSection(section, chordPrototypes, onlyUseChordPrototypes)
            }
		)
		sectionMap.set(position, sectionList)
	}
	return sectionMap
}
