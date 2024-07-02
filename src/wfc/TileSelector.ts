import { Equatable } from "../util/utils"
import { Tile } from "./Tile"
import { TileCanvas } from "./TileCanvas"

export class TileSelector<T extends Equatable<T>> {

	constructor(private canvas: TileCanvas<any,T,any>) {
	}


	public poll2(): Tile<T> {
		let out: undefined | Tile<T> = undefined
		let min = Number.MAX_SAFE_INTEGER
		for(let i = 0; i < this.canvas.getSize(); i++){
			const tile = this.canvas.getTileAtPos(i)
			if(!tile.isActive()) continue
			const numOptions = tile.getNumOptions()
			if(numOptions < min) {
				min = numOptions
				out = tile
			}
		}
		if(out === undefined) throw new Error("No active tiles left on the canvas")
		return out
	}
}
