import { OctavedNote } from "../../music_theory/Note"
import { Random } from "../../util/Random"
import { HigherValues } from "../HigherValues"
import { TileCanvasProps, TileCanvas, unionOfTileCanvasProps } from "../TileCanvas"
import { ChordLevelNode } from "./ChordLevelNode"
import { Chordesque } from "./Chordesque"
import { HWFCNode } from "./HWFCNode"
import { Section } from "./Section"
import { DecisionManager } from "./backtracking"
import { Result } from "./results"

interface SectionLevelNodeProps {
	higherValues: HigherValues
	noteCanvasProps: TileCanvasProps<OctavedNote>
	chordesqueCanvasProps: TileCanvasProps<Chordesque>
	sectionCanvasProps: TileCanvasProps<Section>
	random: Random
	position: number
	decisionManager: DecisionManager
}

export class SectionLevelNode extends HWFCNode<any, Section, Chordesque> {
	private higherValues: HigherValues
	private noteCanvasProps: TileCanvasProps<OctavedNote>
	private chordesqueCanvasProps: TileCanvasProps<Chordesque>
	protected canvas: TileCanvas<any, Section, Chordesque>
	private random: Random
	protected position: number
	protected subNodes: HWFCNode<Section, Chordesque, OctavedNote>[]
	protected decisionManager: DecisionManager

	constructor(props: SectionLevelNodeProps) {
		super()
		this.higherValues = props.higherValues
		this.noteCanvasProps = props.noteCanvasProps
		this.chordesqueCanvasProps = props.chordesqueCanvasProps
		this.random = props.random
		this.position = props.position
		this.subNodes = []
		this.decisionManager = props.decisionManager
		this.canvas = new TileCanvas(
			this.higherValues.numSections,
			props.sectionCanvasProps,
			this.higherValues,
			props.random,
			this,
			this.decisionManager.getDecisions(),
			"section"
		)
	}

	public createChildNode(position: number) {
		const sectionc = this.canvas.getValueAtPosition(position)
		const section = sectionc.getObj()
		const props = {
			higherValues: {
				...this.higherValues, 
				section: sectionc, 
				bpm: section.bpmStrategy === "Custom" ? section.bpm : this.higherValues.bpm,
				numChords: section.numChordsStrategy === "Custom" ? section.numChords : this.higherValues.numChords,
				useRhythm: section.rhythmStrategy === "On" || (section.rhythmStrategy === "Inherit" && this.higherValues.useRhythm),
				rhythmPatternOptions: section.rhythmStrategy === "On" ? section.rhythmPatternOptions : this.higherValues.rhythmPatternOptions,
				melodyLength: section.melodyLengthStrategy === "Custom" ? section.melodyLength : this.higherValues.melodyLength,
			},
			noteCanvasProps: unionOfTileCanvasProps( 
				this.noteCanvasProps, 
				section.noteCanvasProps
			),
			chordesqueCanvasProps: unionOfTileCanvasProps(
				this.chordesqueCanvasProps,
				section.chordesqueCanvasProps
			),
			random: this.random,
			parent: this,
			position,
			decisionManager: this.decisionManager
		}
		if(this.subNodes[position] === undefined) return new ChordLevelNode(props)
		return (this.subNodes[position] as ChordLevelNode).reset(props)
	}

	public mergeResults(subResults: Result<Section>[]): Result<any> {
		return subResults
	}
}