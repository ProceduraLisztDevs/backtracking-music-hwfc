import { OctavedNote } from "../../music_theory/Note"
import { basicRhythm, getRandomRhythmPattern } from "../../music_theory/Rhythm"
import { Random } from "../../util/Random"
import { HigherValues } from "../HigherValues"
import { TileCanvasProps, TileCanvas, unionOfTileCanvasProps } from "../TileCanvas"
import { NoteLevelNode } from "./NoteLevelNode"
import { ChordPrototype, Chordesque } from "./Chordesque"
import { SectionLevelNode } from "./SectionLevelNode"
import { HWFCNode } from "./HWFCNode"
import { Section } from "./Section"
import { Result } from "./results"
import { DecisionManager } from "./backtracking"

interface ChordLevelNodeProps {
	higherValues: HigherValues
	noteCanvasProps: TileCanvasProps<OctavedNote>
	chordesqueCanvasProps: TileCanvasProps<Chordesque>
	random: Random
	parent: SectionLevelNode
	position: number
	decisionManager: DecisionManager
}

export class ChordLevelNode extends HWFCNode<Section, Chordesque, OctavedNote> {
	private higherValues: HigherValues
	private noteCanvasProps: TileCanvasProps<OctavedNote>
	protected canvas: TileCanvas<Section, Chordesque, OctavedNote>
	private random: Random
	protected position: number
	protected subNodes: HWFCNode<Chordesque, OctavedNote, any>[]
	protected decisionManager: DecisionManager
	private backupSubNodes: NoteLevelNode[] = []

	constructor(props: ChordLevelNodeProps) {
		super()
		this.higherValues = props.higherValues 
		this.noteCanvasProps = props.noteCanvasProps
		this.random = props.random
		this.parent = props.parent
		this.position = props.position
		this.subNodes = []
		this.decisionManager = props.decisionManager
		this.canvas = new TileCanvas(
			this.higherValues.numChords,
			props.chordesqueCanvasProps,
			this.higherValues,
			props.random,
			this,
			this.decisionManager.getDecisions(),
			"chord"
		)
	}

	reset(props: ChordLevelNodeProps) {
		this.higherValues = props.higherValues 
		this.noteCanvasProps = props.noteCanvasProps
		this.random = props.random
		this.parent = props.parent
		this.position = props.position
		this.decisionManager = props.decisionManager
		this.backupSubNodes = this.subNodes as NoteLevelNode[]
		this.subNodes = []
		this.canvas.reset(
			this.higherValues.numChords,
			props.chordesqueCanvasProps,
			this.higherValues,
			props.random,
			this,
			this.decisionManager.getDecisions(),
			"chord"
		)
		return this
	}

	public mergeResults(subResults: Result<Chordesque>[]): Result<Section> {
		return subResults
	}

	public createChildNode(position: number): HWFCNode<Chordesque, OctavedNote, any> {
		const chord = this.canvas.getValueAtPosition(position)

		const chordValue = chord.getChord()
		let actualNoteCanvasProps = this.noteCanvasProps
		let actualMelodyLength = (chord instanceof ChordPrototype && chord.melodyLengthStrategy == "Custom" ) ? chord.melodyLength : this.higherValues.melodyLength
		let rhythmPatternOptions = this.higherValues.rhythmPatternOptions
		
		if (chord instanceof ChordPrototype) {
			actualNoteCanvasProps = unionOfTileCanvasProps (
				this.noteCanvasProps, 
				chord.noteCanvasProps,
			)
			if (chord.melodyLengthStrategy === "Custom") actualMelodyLength = chord.melodyLength
			if (chord.rhythmStrategy === "On") rhythmPatternOptions = chord.rhythmPatternOptions
		}

		const chordHasPreference =
			chord instanceof ChordPrototype &&
			(chord.rhythmStrategy === "On" ||
				chord.rhythmStrategy === "Off")

		const useRhythm = chordHasPreference
			? chord.rhythmStrategy === "On"
			: this.higherValues.useRhythm

		const rhythmPattern = useRhythm ? getRandomRhythmPattern(
			actualMelodyLength,
			rhythmPatternOptions,
			this.random,
		) : basicRhythm(actualMelodyLength)

		const newHigherValues: HigherValues = {...{...this.higherValues, chord: chordValue, useRhythm, rhythmPattern, melodyLength: rhythmPattern.getUnits().filter(u => u.type == "note").length},
			...(chord instanceof ChordPrototype ? {
				bpm: chord.bpmStrategy === "Custom" ? chord.bpm : this.higherValues.bpm,
			} : {})
		}
		
		if(this.subNodes[position] === undefined){
			if(this.backupSubNodes[position] === undefined){
				return new NoteLevelNode(
					actualNoteCanvasProps,
					newHigherValues,
					this.random,
					this,
					position,
					this.decisionManager
				)
			}
			else return (this.backupSubNodes[position] as NoteLevelNode).reset(
				actualNoteCanvasProps,
				newHigherValues,
				this.random,
				this,
				position,
				this.decisionManager
			)
		} else {
			return (this.subNodes[position] as NoteLevelNode).reset(
				actualNoteCanvasProps,
				newHigherValues,
				this.random,
				this,
				position,
				this.decisionManager
			)
		}
	}
	
}
