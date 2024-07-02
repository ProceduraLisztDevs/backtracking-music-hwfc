import { Equatable } from "../../../util/utils"
import { HigherValues } from "../../HigherValues"
import { Tile } from "../../Tile"

export type Constraint<T extends Equatable<T>> = HardConstraint<T> | SoftConstraint<T>

export interface HardConstraint<T extends Equatable<T>> {
	name: string
	check: (tile: Tile<T>, higherValues: HigherValues) => boolean
}

export function isHardConstraint<T extends Equatable<T>>(
	constraint: Constraint<T>,
): constraint is HardConstraint<T> {
	return "check" in constraint
}

export abstract class SoftConstraint<T extends Equatable<T>> {
	abstract name: string
	abstract weight(tile: Tile<T>, higherValues: HigherValues): number
	protected bonus: number

	constructor(bonus: number) {
		this.bonus = bonus
	}
}
