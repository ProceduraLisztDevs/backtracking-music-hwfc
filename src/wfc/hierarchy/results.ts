import { Chord } from "../../music_theory/Chord"
import { OctavedNote } from "../../music_theory/Note"
import { RhythmPattern } from "../../music_theory/Rhythm"
import { Canvasable } from "../../util/utils"
import { Chordesque } from "./Chordesque"
import { Section } from "./Section"
import { SectionLevelNode } from "./SectionLevelNode"

export type EntireResult = Result<any> & SectionResult[]

export type SectionResult = Result<Section> & ChordResult[]

export type ChordResult = Result<Chordesque> & {
	chord: Chord
	notes: OctavedNote[]
	rhythmPattern: RhythmPattern
	bpm: number
}

export type MelodyResult = Result<OctavedNote> & OctavedNote

export interface Result<T extends Canvasable<T>> {}

export class ResultManager {
	
	constructor(public sectionLevelNode : SectionLevelNode) {}

	public generate(): EntireResult {
		const chordLevelNodes = this.sectionLevelNode.getSubNodes()
		const noteLevelNodes = []
		for(let i = 0; i < chordLevelNodes.length; i++){
			noteLevelNodes[i] = chordLevelNodes[i].getSubNodes()
		}
		const sectionResults: Result<Chordesque>[] = []
		for (let i = 0; i < chordLevelNodes.length; i++) {
			const chordResults: Result<OctavedNote>[] = []
			for(let j = 0; j < noteLevelNodes[i].length; j++) {
				const noteLevelNode = noteLevelNodes[i][j]
				if(noteLevelNode === undefined) throw new Error("Node not added")
				chordResults.push(noteLevelNode.mergeResults(noteLevelNode.getCanvas().generate()))
			}
			const chordLevelNode = chordLevelNodes[i]
			if(chordLevelNode === undefined) throw new Error("Node not added")
			sectionResults.push(chordLevelNode.mergeResults(chordResults))
		}
		return this.sectionLevelNode.mergeResults(sectionResults) as EntireResult
	}
}