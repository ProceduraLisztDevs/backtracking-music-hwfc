import { Random } from "../util/Random"
import { Equatable, arrayEquals } from "../util/utils"

type RhythmUnit = {
	duration: number
	type: "note" | "rest"
}

export class RhythmPattern implements Equatable<RhythmPattern> {
	constructor(
		private units: RhythmUnit[]
	) {}

	public equals(other: any): boolean {
		if(!(other instanceof RhythmPattern)) return false
		return arrayEquals(this.units, other.units)
	}

	public getUnits(): RhythmUnit[] {
		return this.units
	}

	clone(): RhythmPattern {
		return new RhythmPattern([...this.units])
	}
}

export function durationOfRhythmPattern(pattern: RhythmPattern) {
	return pattern.getUnits().reduce((sum, unit) => sum + unit.duration, 0)
}

export function numberOfNotesInRhythmPattern(pattern: RhythmPattern) {
	return pattern.getUnits().filter((unit) => unit.type == "note").length
}

export function basicRhythm(length: number): RhythmPattern {
	return new RhythmPattern(Array(length).fill({type:"note", duration:1}))
}

function abstractPatternsForLength(length: number): number[][] {
	if (length < 0) throw new Error("Pattern can't have negative length")

	const out: number[][] = []
	if (length == 0) out.push([])

	for (let i = 1; i <= length; i++) {
		const subResults = abstractPatternsForLength(length - i)
		for (const subResult of subResults) {
			subResult.push(i)
			out.push(subResult)
		}
	}
	return out
}

export interface RhythmPatternOptions {
	minimumNumberOfUnits?: number
	onlyStartOnNote: boolean
	minimumNumberOfNotes: number
	maximumRestLength: number
}

export function generateRhythmPatterns(
	length: number,
	{
		minimumNumberOfUnits = 1,
		onlyStartOnNote,
		minimumNumberOfNotes,
		maximumRestLength,
	}: RhythmPatternOptions,
): RhythmPattern[] {
	const abstractPatterns = abstractPatternsForLength(length).filter(
		(pattern) => pattern.length >= minimumNumberOfUnits,
	)
	return abstractPatterns.flatMap((abstractPattern) =>
		allRhythmicCombinations({
			prefix: [],
			abstractPattern,
			onlyStartOnNote,
			minimumNumberOfNotes,
			maximumRestLength,
		}),
	).map(us => new RhythmPattern(us))
}

export function getRandomRhythmPattern(
	length: number,
	options: RhythmPatternOptions,
	random: Random,
): RhythmPattern {
	const patterns = generateRhythmPatterns(length, options)
	if (patterns.length == 0) throw new Error("No possible patterns")
	return patterns[random.nextInt(patterns.length)]
}

interface RhytmicCombinationOptions {
	prefix: RhythmUnit[]
	abstractPattern: number[]
	onlyStartOnNote: boolean
	minimumNumberOfNotes: number
	maximumRestLength: number
}

function allRhythmicCombinations({
	prefix,
	abstractPattern,
	onlyStartOnNote,
	minimumNumberOfNotes,
	maximumRestLength,
}: RhytmicCombinationOptions):RhythmUnit[][] {
	if (minimumNumberOfNotes > abstractPattern.length) return []
	if (abstractPattern.length == 0) return [prefix]
	const out: RhythmUnit[][] = []
	const unitLength = abstractPattern[0]
	const restOfPattern = abstractPattern.slice(1)

	const prefixPlusNote = [
		...prefix,
		{ duration: unitLength, type: "note" } as RhythmUnit,
	]
	out.push(
		...allRhythmicCombinations({
			prefix: prefixPlusNote,
			abstractPattern: restOfPattern,
			onlyStartOnNote: false,
			minimumNumberOfNotes: minimumNumberOfNotes - 1,
			maximumRestLength,
		}),
	)

	if (!onlyStartOnNote && unitLength <= maximumRestLength) {
		const prefixPlusRest = [
			...prefix,
			{ duration: unitLength, type: "rest" } as RhythmUnit,
		]
		out.push(
			...allRhythmicCombinations({
				prefix: prefixPlusRest,
				abstractPattern: restOfPattern,
				onlyStartOnNote: true,
				minimumNumberOfNotes,
				maximumRestLength,
			}),
		)
	}

	return out
}
