import { Equatable } from "../util/utils"
import { TileCanvas } from "./TileCanvas"

export interface TileProps<T extends Equatable<T>> {
	status: T | Set<[T, number]> | "header" | "trailer"
	position: number
	canvas: TileCanvas<any, T, any>
}

function getItemFromSet<T>(set: Set<T>, predicate: (item: T) => boolean): T | undefined {
    for (const item of set) {
        if (predicate(item)) {
            return item;
        }
    }
    return undefined; // Return undefined if no item matches the predicate
}

export class Tile<T extends Equatable<T>> {
	private position: number
	private numOptions: number
	private status: T | Set<[T, number]> | "header" | "trailer"
	private canvas: TileCanvas<any, T, any>
	private collapsed: boolean

	constructor(props: TileProps<T>) {
		this.status = props.status
		this.position = props.position
		this.canvas = props.canvas
		if (props.status === "header" || props.status === "trailer") {
			this.numOptions = 0
			this.collapsed = false
		} else if (props.status instanceof Set) {
			this.numOptions = props.status.size
			this.collapsed = false
		} else {
			this.numOptions = 1
			this.collapsed = true
		}
	}

	public clone(): Tile<T> {
		const newStatus = this.status instanceof Set ? new Set(this.status) : (this.status == "header" || this.status == "trailer") ? this.status : this.status.clone()
		const out = new Tile({
			status: newStatus,
			position: this.position,
			canvas: this.canvas
		})
		return out
	}

	public getPrev(reachOver: boolean): Tile<T> {
		if (this.position == 0) {
			if(reachOver) return this.canvas.lastTileOfPrevious()
			return Tile.header(this.canvas)
		}
		else return this.canvas.getTileAtPos(this.position - 1)
	}

	public getNext(reachOver: boolean): Tile<T> {
		if (this.position == this.canvas.getSize() - 1) {
			if (reachOver) return this.canvas.firstTileOfNext()
			return Tile.trailer(this.canvas)
		}
		else return this.canvas.getTileAtPos(this.position + 1)
	}

	static header<T extends Equatable<T>>(canvas: TileCanvas<any, T, any>): Tile<T> {
		return new Tile<T>({
			status: "header",
			position: -1,
			canvas: canvas,
		})
	}

	static trailer<T extends Equatable<T>>(canvas: TileCanvas<any, T, any>): Tile<T> {
		return new Tile<T>({
			status: "trailer",
			position: canvas.getSize(),
			canvas: canvas,
		})
	}

	public updateOptions(options?: T[]): number {
		if(this.status == "header" || this.status == "trailer") return 0
		if (options === undefined) {
			if (!(this.status instanceof Set)) return -1
			options = [...(this.status as Set<[T, number]>)].map(
				([option, _weight]) => option,
			)
		}

		const newOptionWeights: [T, number][] = []
		let out = 0

		options.forEach((option: T) => {
			const weight = this.canvas
				.getConstraints()
				.weight(
					this.hypotheticalTile(option),
					this.canvas.getHigherValues(),
				)
			if (weight <= 0) return
			const optionWeightPair: [T, number] = [option, weight]
			newOptionWeights.push(optionWeightPair)
			out++
		})

		if (out === 0) {
			throw new ConflictError()
		} else if (out === 1) {
			if (!this.collapse(newOptionWeights[0][0])){
				throw new ConflictError()
			}
			return 1
		}

		this.status = new Set(newOptionWeights)
		this.numOptions = out

		// this.canvas.addTileOption(this)
		return out
	}

	private hypotheticalTile(value: T): Tile<T> {
		const out = new Tile({
			canvas: this.canvas,
			position: this.position,
			status: value,
		})
		return out
	}

	// returns whether it was a successful collapse
	public collapse(value: T): boolean {
		if(! (this.status instanceof Set)) {
			if(value.equals(this.status)){
				return true
			}
			throw new Error("Already collapsed, bozo")
		}
 		const oldStatus = this.status
		this.status = value
		this.canvas.collapseOne()
		this.collapsed = true
		try {
			this.getPrev(true).updateOptions()
			this.getNext(true).updateOptions()
		} catch (e) {
			if(! (e instanceof ConflictError)) throw e
			this.collapsed = false
			this.canvas.retractOne()
			this.status = oldStatus
			this.removeValue(value)

			return false
		}
		
		return true
	}

	public removeValue(value: T) {
		if(!(this.status instanceof Set)){
			throw new Error("Can't remove from non-set status")
		}
		const valuePair = getItemFromSet(this.status, t => t[0] == value)
		if (valuePair === undefined) throw new Error("This wasn't in the set")
		this.status.delete(valuePair)
	}

	public getNumOptions(): number {
		if(this.status instanceof Set) {
			this.numOptions = this.status.size
		} else if (this.status == "header" || this.status == "trailer") {
			this.numOptions = 0
		} else {
			this.numOptions = 1
		}
		return this.numOptions
	}

	public isActive(): boolean {
		return this.status instanceof Set
	}

	public isCollapsed(): boolean {
		if(this.status instanceof Set && this.status.size == 1){
			const newStatus = this.status.values().next().value[0]
			this.status = newStatus
			this.collapsed = true
			this.canvas.collapseOne()
		}
		return this.collapsed
	}

	public chooseValue(): T | undefined {
		try{
			this.updateOptions()
		} catch (e) {
			if(e instanceof ConflictError) return undefined
			throw e
		}
		if(!(this.status instanceof Set)) return this.status as T
		const options = Array.from(this.status as Set<[T, number]>)
		const totalWeight = options.reduce(
			(acc, [_, weight]) => acc + weight,
			0,
		)
		const random = this.canvas.getRandom()
		let randomWeight = random.next() * totalWeight
		let out: T | undefined = undefined
		for (const [option, weight] of options) {
			randomWeight -= weight
			if (randomWeight < 0) {
				out = option
				break
			}
		}
		return out
	}

	public getValue(): T {
		if (!this.collapsed) {
			throw new Error(`Tile at ${this.position} not collapsed, has status ${this.status}`)
		}
		return this.status as T
	}

	public getPosition(): number {
		return this.position
	}

	public getCanvas(): TileCanvas<any, T, any> {
		return this.canvas
	}

	public getOptions(): T[] {
		if (this.status instanceof Set) return Array.from(this.status).map(a => a[0])
		if (this.status == "header" || this.status == "trailer") throw new Error("HOW")
		return [this.status]
	}

	public decrementNumOptions() {
		this.numOptions--
	}

	public getStatus() {
		return this.status
	}
}

export class ConflictError extends Error{
	constructor(m?: string) {
		super(m ?? "No valid options left")
	}
}