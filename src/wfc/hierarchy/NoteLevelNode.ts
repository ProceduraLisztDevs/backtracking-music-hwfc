import { OctavedNote } from "../../music_theory/Note"
import { Random } from "../../util/Random"
import { HigherValues } from "../HigherValues"
import { TileCanvas, TileCanvasProps } from "../TileCanvas"
import { ChordLevelNode } from "./ChordLevelNode"
import { Chordesque } from "./Chordesque"
import { HWFCNode } from "./HWFCNode"
import { DecisionManager } from "./backtracking"
import { ChordResult, MelodyResult, Result } from "./results"

export class NoteLevelNode extends HWFCNode<Chordesque, OctavedNote, any>{
	protected canvas: TileCanvas<Chordesque, OctavedNote, any>
	protected subNodes: HWFCNode<OctavedNote, any, any>[] = []

	constructor(
		canvasProps: TileCanvasProps<OctavedNote>,
		private higherValues: HigherValues,
		random: Random,
		protected parent: ChordLevelNode,
		protected position: number,
		protected decisionManager: DecisionManager
	) {
		super()
		this.canvas = new TileCanvas<Chordesque, OctavedNote, any>(
			higherValues.melodyLength,
			canvasProps,
			higherValues,
			random,
			this,
			decisionManager.getDecisions(),
			"melody"
		)
	}

	public reset(
		canvasProps: TileCanvasProps<OctavedNote>,
		higherValues: HigherValues,
		random: Random,
		parent: ChordLevelNode,
		position: number,
		decisionManager: DecisionManager
	) {
		this.higherValues = higherValues
		this.parent = parent
		this.position = position
		this.canvas.reset(
			higherValues.melodyLength,
			canvasProps,
			higherValues,
			random,
			this,
			decisionManager.getDecisions(),
			"melody"
		)
		return this
	}

	public mergeResults(subResults: Result<OctavedNote>[]): Result<Chordesque> {
		const chordResult: ChordResult = {
			chord: this.higherValues.chord!,
			notes: (subResults as MelodyResult[]),
			rhythmPattern: this.higherValues.rhythmPattern!,
			bpm: this.higherValues.bpm
		} 
		return chordResult
	}

	public createChildNode(position: number): HWFCNode<OctavedNote, any, any> | undefined {
		return undefined
	}

	public createSubNodes(positions?: number[]): void {
	}

	public nullifyChord(){
		this.higherValues.chord = undefined
		this.canvas.getHigherValues().chord = undefined
	}

}
