import { Grabber } from "../Grabber"
import { HigherValues } from "../HigherValues"
import { Tile } from "../Tile"
import { Section } from "../hierarchy/Section"
import { HardConstraint } from "./concepts/Constraint"

export class SectionOnlyPrecededByHardConstraint
	implements HardConstraint<Section>
{
	name = "Section Only Preceded By"
	constructor(private sectionName: string, private grabber: Grabber<string[]>,
		private reachOverPrev: boolean, private reachOverNext: boolean) {
	}

	check(tile: Tile<Section>, higherValues: HigherValues): boolean {
		const section = tile.getValue()
		const prev = tile.getPrev(this.reachOverPrev)
		const next = tile.getNext(this.reachOverNext)
		
		let out = true
		if(prev.isCollapsed()){
			out &&= this.checkPair(prev.getValue(), section, higherValues)
		}
		if(next.isCollapsed()){
			out &&= this.checkPair(section, next.getValue(), higherValues)
		}
		return out
	}

	checkPair(
		first: Section,
		second: Section,
		higherValues: HigherValues,
	): boolean {
		if (second.getName() != this.sectionName) return true
		const sectionSet = this.grabber(higherValues)
		return sectionSet.some((sectionName) => sectionName === first.getName())
	}
}
