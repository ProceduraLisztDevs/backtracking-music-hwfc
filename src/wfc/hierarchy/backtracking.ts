import { OctavedNote } from "../../music_theory/Note";
import { Decision } from "../TileCanvas";
import { Chordesque } from "./Chordesque";
import { Section } from "./Section";

export type SharedDecision = ({
    level : "section";
} & Decision<Section>) | ({
    level : "chord";
    sectionNumber : number;
} & Decision<Chordesque>) | ({
    level : "melody";
    sectionNumber : number;
    chordNumber : number;
} & Decision<OctavedNote>)

export type CanvasChanged = {
    level: "section";
} | {
    level: "chord";
    sectionNumber : number;
} | {
    level : "melody";
    sectionNumber : number;
    chordNumber : number;
}

export class DecisionManager {
    private decisions : SharedDecision[] = []
    private changedCanvases : CanvasChanged[] = []

    constructor(){}
    
    public getDecisions() {
		return this.decisions
	}

    public getChangedCanvases() {
        return this.changedCanvases
    }

    public noteCanvasChange(canvasChanged: CanvasChanged) {
        this.changedCanvases.push(canvasChanged)
    }

    
}