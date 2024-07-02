import { OctavedNote } from "../music_theory/Note"
import { Random } from "../util/Random"
import { Canvasable, Equatable } from "../util/utils"
import { ConstraintSet } from "./ConstraintSet"
import { HigherValues } from "./HigherValues"
import { OptionsPerCell } from "./OptionsPerCell"
import { ConflictError, Tile } from "./Tile"
import { TileSelector } from "./TileSelector"
import { Chordesque } from "./hierarchy/Chordesque"
import { HWFCNode } from "./hierarchy/HWFCNode"
import { NoteLevelNode } from "./hierarchy/NoteLevelNode"
import { Section } from "./hierarchy/Section"
import { SharedDecision } from "./hierarchy/backtracking"

export interface TileCanvasProps<T extends Canvasable<T>> {
	optionsPerCell: OptionsPerCell<T>
	constraints: ConstraintSet<T>
}

export const unionOfTileCanvasProps = <T extends Equatable<T>>(first: TileCanvasProps<T>, second: TileCanvasProps<T>) => {
	return {
		optionsPerCell: first.optionsPerCell.union(second.optionsPerCell),
		constraints: first.constraints.union(second.constraints),
	}
}

const optionsToWeighedOptions = <T>(options: Set<T>): Set<[T, number]> => {
	return new Set([...options].map((option: T) => [option, 1]))
}

export type Decision<T extends Canvasable<T>> = {
	canvas: TileCanvas<any, T, any>
	index : number
	value : T
	oldState : Tile<T>[]
}

export class TileCanvas<P extends Canvasable<P>, T extends Canvasable<T>, C extends Canvasable<C>> {
	private collapsed: number
	private tiles: Tile<T>[]
	private pq: TileSelector<T>
	private higherValues: HigherValues
	private constraints: ConstraintSet<T>
	private initialState: Tile<T>[]

	public getSize(): number {
		return this.size
	}

	constructor(
		private size: number,
		props: TileCanvasProps<T>,
		higherValues: HigherValues,
		private random: Random,
		private node: HWFCNode<P, T, C>,
		private decisions: SharedDecision[],
		private level: "section" | "chord" | "melody"
	) {
		this.collapsed = 0

		const optionsPerCell = props.optionsPerCell

		this.pq = new TileSelector<T>(this)
		this.higherValues = higherValues
		this.constraints = props.constraints

		this.tiles = [this.createTile(optionsPerCell, 0)]

		for (let i = 1; i < this.size; i++) {
			const tile = this.createTile(optionsPerCell, i)
			this.tiles.push(tile)
		}

		this.initialState = this.tiles.map(t => t.clone())
	}

	public reset(
		size: number,
		props: TileCanvasProps<T>,
		higherValues: HigherValues,
		random: Random,
		node: HWFCNode<P, T, C>,
		decisions: SharedDecision[],
		level: "section" | "chord" | "melody"
	) {
		this.size = size
		this.random = random
		this.node = node
		this.decisions = decisions
		this.level = level
		this.collapsed = 0

		const optionsPerCell = props.optionsPerCell

		this.higherValues = higherValues
		this.constraints = props.constraints

		this.tiles = [this.createTile(optionsPerCell, 0)]

		for (let i = 1; i < this.size; i++) {
			const tile = this.createTile(optionsPerCell, i)
			this.tiles.push(tile)
		}

		this.initialState = this.tiles.map(t => t.clone())
	}

	public initialize() {
		this.tiles.forEach((tile) => {
			if(tile.isCollapsed()) return
			tile.updateOptions()
		})
	}

	private createTile(optionsPerCell: OptionsPerCell<T>, i: number) {
		const options = optionsPerCell.getOptions(i)
		const status = optionsToWeighedOptions(new Set(options))
		return new Tile<T>({
			status,
			canvas: this,
			position: i,
		})
	}

	public prevCanvas(): TileCanvas<P,T,C> | undefined {
		const prevIndex = this.node.getPosition() - 1
		const parent = this.node.getParent()
		if (parent === undefined) return undefined
		if (prevIndex < 0)  {
			const grandparent = parent.getParent()
			if(grandparent === undefined) return undefined
			const parentPrevIndex = parent.getPosition() - 1
			if (parentPrevIndex < 0) return undefined
			const uncle = grandparent.getSubNodes()[parentPrevIndex]
			if (uncle === undefined) return undefined
			const uncleLength = uncle.getSubNodes().length
			if (uncleLength == 0) return undefined
			return uncle.getSubNodes()[uncleLength - 1].getCanvas()
		}
		return parent.getSubNodes()[prevIndex].getCanvas()
	}

	firstTileOfNext(): Tile<T> {
		const nextIndex = this.node.getPosition() + 1
		const parent: HWFCNode<any, P, T> | undefined = this.node.getParent()
		if (parent === undefined) return Tile.trailer(this)
		if (nextIndex >= parent.getSubNodes().length) {
			const grandparent = parent.getParent()
			if(grandparent === undefined) return Tile.trailer(this)
			const parentNextIndex = parent.getPosition() + 1
			if (parentNextIndex >= grandparent.getSubNodes().length) return Tile.trailer(this)
			const uncle = grandparent.getSubNodes()[parentNextIndex]
			if (uncle === undefined || uncle.getSubNodes().length == 0) return Tile.trailer(this)
			return uncle.getSubNodes()[0].getCanvas().tiles[0]
		}
		const next: HWFCNode<P, T, C> = parent.getSubNodes()[nextIndex]
		const nextCanvas = next.getCanvas()
		return nextCanvas.tiles[0]
	}

	lastTileOfPrevious(): Tile<T> {
		const prevIndex = this.node.getPosition() - 1
		const parent = this.node.getParent()
		if (parent === undefined) return Tile.header(this)
		if (prevIndex < 0)  {
			const grandparent = parent.getParent()
			if(grandparent === undefined) return Tile.trailer(this)
			const parentPrevIndex = parent.getPosition() - 1
			if (parentPrevIndex < 0) return Tile.trailer(this)
			const uncle = grandparent.getSubNodes()[parentPrevIndex]
			if (uncle === undefined) return Tile.trailer(this)
			const uncleLength = uncle.getSubNodes().length
			if (uncleLength == 0) return Tile.trailer(this)
			const prevCanvasTiles = uncle.getSubNodes()[uncleLength - 1].getCanvas().tiles
			return prevCanvasTiles[prevCanvasTiles.length - 1]
		}
		const prev = parent.getSubNodes()[prevIndex]
		const prevCanvas = prev.getCanvas()
		return prevCanvas.tiles[prevCanvas.size - 1]
	}

	public getConstraints(): ConstraintSet<T> {
		return this.constraints
	}

	public getHigherValues(): HigherValues {
		return this.higherValues
	}

	public collapseOne(): number {
		return ++this.collapsed
	}

	public retractOne(): number {
		return --this.collapsed
	}

	public getRandom(): Random {
		return this.random
	}

	public getState(): Tile<T>[] {
		return this.tiles.map(t => t.clone())
	}

	public setState(state: Tile<T>[]) {
		this.tiles = state
		this.collapsed = state.filter(t => t.isCollapsed()).length
	}

	public collapseNext() {
		if (this.collapsed >= this.size) throw new Error("Nothing to collapse")
		const tileToCollapse = this.pq.poll2()

		let numOptions = tileToCollapse.getNumOptions()
		const oldState = this.tiles.map(t => t.clone())

		while(numOptions > 0){
			const value = tileToCollapse.chooseValue()
			if (value === undefined) {
				this.backtrack()
				return
			}
			if (tileToCollapse.collapse(value)){
				switch(this.level){
					case "section":
						this.decisions.push({
							canvas: this as unknown as TileCanvas<any, Section, Chordesque>,
							level: "section",
							index: tileToCollapse.getPosition(),
							value: tileToCollapse.getValue() as unknown as Section,
							oldState: oldState as unknown as Tile<Section>[],
						})
						break
					case "chord":
						this.decisions.push({
							canvas: this as unknown as TileCanvas<Section, Chordesque, OctavedNote>,
							level: "chord",
							index: tileToCollapse.getPosition(),
							value: tileToCollapse.getValue() as unknown as Chordesque,
							oldState: oldState as unknown as Tile<Chordesque>[],
							sectionNumber: this.node.getPosition(),
						})
						break
					case "melody":
						this.decisions.push({
							canvas: this as unknown as TileCanvas<Chordesque, OctavedNote, any>,
							level: "melody",
							index: tileToCollapse.getPosition(),
							value: tileToCollapse.getValue() as unknown as OctavedNote,
							oldState: oldState as unknown as Tile<OctavedNote>[],
							chordNumber: this.node.getPosition(),
							sectionNumber: this.node.getParent()!.getPosition(),
						})
						break
				}
				this.tiles[tileToCollapse.getPosition()] = tileToCollapse
				break
			}
			numOptions--
		}
		if(numOptions == 0) this.backtrack()
		return
	}

	private resetState(): void{
		this.setState(this.initialState.map(t => t.clone()))
	}

	private regenBefore(){
		if(this.level == "melody"){
			for(let i = 0; i < this.node.getParent()!.getParent()!.getSubNodes().length; i++){
				this.node.getParent()!.getParent()!.getSubNodes()[i].getCanvas().generate()
			}
	
			for(let i = 0; i < this.node.getParent()!.getParent()!.getSubNodes().length; i++){
				if(i < this.node.getParent()!.getPosition()){
					for(let j = 0; j < this.node.getParent()!.getParent()!.getSubNodes()[i].getSubNodes().length; j++){
						this.node.getParent()!.getParent()!.getSubNodes()[i].getSubNodes()[j].getCanvas().generate()
					}
	
				} else if (i == this.node.getParent()!.getPosition()){
					for(let j = 0; j < this.node.getParent()!.getParent()!.getSubNodes()[i].getSubNodes().length; j++){
						if(j < this.node.getPosition()){
							this.node.getParent()!.getParent()!.getSubNodes()[i].getSubNodes()[j].getCanvas().generate()
						} else break
					}
				}
			}
		}
		if(this.level == "chord"){
			for(let i = 0; i < this.node.getParent()!.getSubNodes().length; i++){
				if(i < this.node.getPosition()){
					this.node.getParent()!.getSubNodes()[i].getCanvas().generate()
				} else break
			}
		}
	}

	private backtrack() {
		if(this.decisions.length < 1) throw new ConflictError()
		const decision = this.decisions.pop()
		if(decision === undefined) throw new Error("Decision should exist")
		if(!this.isDecisionAboutThis(decision)) {
			this.decisions.push(decision)
			this.getCanvasForDecision(decision).tryAnother()
			
			let found = false
			while (!found) {
				try {
					this.resetState()
					this.regenBefore()
					this.initialize()
					found = true
				} catch (e) {
					if (!(e instanceof ConflictError)) throw e
					this.getCanvasForDecision(this.decisions[this.decisions.length-1]).tryAnother()
				}
			}

			return
		}

		switch(decision.level){
			case "section":
				(this as unknown as TileCanvas<any, Section, Chordesque>).tiles = decision.oldState;
				(this as unknown as TileCanvas<any, Section, Chordesque>).tiles[decision.index].removeValue(decision.value);
				break
			case "chord":
				(this as unknown as TileCanvas<Section, Chordesque, OctavedNote>).tiles = decision.oldState;
				(this as unknown as TileCanvas<Section, Chordesque, OctavedNote>).tiles[decision.index].removeValue(decision.value);

				for(let i = 0; i < this.node.getParent()!.getSubNodes().length; i++){
					if(i > this.node.getPosition()){
						this.node.getParent()!.getSubNodes()[i].getCanvas().resetState()
						for(let j = 0; j < this.node.getParent()!.getSubNodes()[i].getSubNodes().length; j++){
							(this.node.getParent()!.getSubNodes()[i].getSubNodes()[j] as unknown as NoteLevelNode).nullifyChord()
							this.node.getParent()!.getSubNodes()[i].getSubNodes()[j].getCanvas().resetState()
						}
					} else if (i < this.node.getPosition()){
						for(let j = 0; j < this.node.getParent()!.getSubNodes()[i].getSubNodes().length; j++){
							this.node.getParent()!.getSubNodes()[i].getSubNodes()[j].getCanvas().resetState()
						}
					}
					
				}

				break
			case "melody":
				(this as unknown as TileCanvas<Chordesque, OctavedNote, any>).tiles = decision.oldState;
				(this as unknown as TileCanvas<Chordesque, OctavedNote, any>).tiles[decision.index].removeValue(decision.value);

				//empty later canvases to be sure
				const chordPos = this.node.getParent()!.getPosition()
				const sectionLevelNode = this.node.getParent()!.getParent()!
				const chordLevelNodes = sectionLevelNode.getSubNodes()
				const siblingNoteNodes = chordLevelNodes[chordPos].getSubNodes()

				for(let i = this.node.getPosition() + 1; i<siblingNoteNodes.length; i++){
					siblingNoteNodes[i].getCanvas().resetState()
				}

				for(let i = chordPos + 1; i < chordLevelNodes.length; i++){
					for(let noteLevelNode of chordLevelNodes[i].getSubNodes()){
						noteLevelNode.getCanvas().resetState();
					}
				}
				break
		}
		try{
			this.initialize()
			this.collapsed = this.tiles.filter(t => t.isCollapsed()).length
		} catch (e) {
			if(!(e instanceof ConflictError)) throw e
			this.backtrack()
		}
	}

	public generate(): T[] {
		while (this.collapsed < this.size) {
			this.collapseNext()
		}

		const results = this.tiles.map((tile) => tile.getValue())
		if(this.level == "melody") return results

		if(this.node.getSubNodes().length < this.size) {
			this.node.createSubNodes()
		} else {
			for(let i = 0; i < this.size; i++){
				const higherValue = this.level == "section" ? this.node.getSubNodes()[i].getCanvas().getHigherValues().section :  this.node.getSubNodes()[i].getCanvas().getHigherValues().chord
				if(higherValue === undefined || !results[i].equals(higherValue)){
					this.node.createSubNodes()
					break
				}
			}
		}
		
		return results
	}

	public tryAnother(): T[] {
		this.backtrack()
		this.regenBefore()
		return this.generate()
	}

	public getNode(): HWFCNode<P,T, C> {
		return this.node
	}

	public getValueAtPosition(position: number): T {
		if(this.collapsed < this.size) throw new Error("The canvas is not fully collapsed yet")
		return this.tiles[position].getValue()
	}

	public getLastValue(): T {
		return this.tiles[this.size - 1].getValue()
	}

	public getLevel() {
		return this.level
	}

	public getTileAtPos(i: number) {
		return this.tiles[i]
	}

	private isDecisionAboutThis(decision: SharedDecision): boolean {
		if (this.level != decision.level) return false
		switch(decision.level){
			case "section":
				return true
			case "chord":
				return this.node.getPosition() == decision.sectionNumber
			case "melody":
				return this.node.getParent()!.getPosition() == decision.sectionNumber && this.node.getPosition() == decision.chordNumber

		}
	}

	private getCanvasForDecision(decision: SharedDecision): TileCanvas<any,any,any> {
		const sectionLevelNode = this.level == "section" ? this.node : this.level == "chord" ? this.node.getParent() : this.node.getParent()?.getParent()

		switch(decision.level){
			case "section":
				return sectionLevelNode?.getCanvas()!
			case "chord":
				return sectionLevelNode?.getSubNodes()[decision.sectionNumber].getCanvas()!
			case "melody":
				return sectionLevelNode?.getSubNodes()[decision.sectionNumber].getSubNodes()[decision.chordNumber].getCanvas()!
		}
	}

	public isCollapsed(){
		return this.size == this.collapsed
	}
}


