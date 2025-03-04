import { useState } from "react"
import { errorsInAppState, useAppContext } from "../AppState"
import { MidiPlayer } from "./MidiPlayer"
import { Chord } from "../music_theory/Chord"
import { OctavedNote } from "../music_theory/Note"
import { Random } from "../util/Random"
import { ConstraintSet } from "../wfc/ConstraintSet"
import { OptionsPerCell } from "../wfc/OptionsPerCell"
import { TileCanvasProps } from "../wfc/TileCanvas"
import { convertIRToChordConstraint, convertIRToNoteConstraint } from "../wfc/constraints/constraintUtils"
import { ChordPrototype, ChordPrototypeIR, Chordesque, chordPrototypeIRToChordPrototype, chordesqueIRMapToChordesqueMap } from "../wfc/hierarchy/Chordesque"
import { ChordPrototypeOnlyFollowedByConstraint } from "../wfc/constraints/ChordPrototypeOnlyFollowedByConstraint"
import { constantStringArrayGrabber } from "../wfc/grabbers/constantGrabbers"
import { ChordPrototypeOnlyPrecededByConstraint } from "../wfc/constraints/ChordPrototypeOnlyPrecededByConstraint"
import { Constraint } from "../wfc/constraints/concepts/Constraint"
import { Section, sectionIRMapToSectionMap, sectionIRToSection } from "../wfc/hierarchy/Section"
import { SectionOnlyPrecededByHardConstraint } from "../wfc/constraints/SectionOnlyPrecededByHardConstraint"
import { SectionOnlyFollowedByHardConstraint } from "../wfc/constraints/SectionOnlyFollowedByHardConstraint"
import { SectionLevelNode } from "../wfc/hierarchy/SectionLevelNode"
import { DecisionManager } from "../wfc/hierarchy/backtracking"
import { ResultManager } from "../wfc/hierarchy/results"
import { entireResultToOutput } from "../audio/midi"
import { BreadthFirstTraverser } from "../wfc/hierarchy/BreadthFirstTraverser"

interface ParseChordPrototypesReturn {
	parsedChordPrototypes: ChordPrototype[]
	chordPrototypeConstraints: Constraint<Chordesque>[]
}
export function parseChordPrototypes(chordPrototypes: ChordPrototypeIR[]): ParseChordPrototypesReturn {
	const parsedChordPrototypes = []
	const chordPrototypeConstraints = []

	const properlyNamedChordPrototypes = chordPrototypes.map(proto => {
		if (proto.name !== "") return proto
		const protoName = `ChordPrototype${proto.id}`
		return { ...proto, name: protoName }
	})

	for (const protoIR of properlyNamedChordPrototypes) {
		parsedChordPrototypes.push(chordPrototypeIRToChordPrototype(protoIR))

		if (protoIR.restrictPrecedingChords) {
			if (protoIR.allowedPrecedingChords.every(chordName => {
				if (properlyNamedChordPrototypes.some(proto => proto.name === chordName)) return true
				return (Chord.parseChordString(chordName) !== undefined)
			})) {
				chordPrototypeConstraints.push(new ChordPrototypeOnlyPrecededByConstraint(protoIR.name, constantStringArrayGrabber(protoIR.allowedPrecedingChords), true, true))
			}
		}

		if (protoIR.restrictFollowingChords) {
			if (protoIR.allowedFollowingChords.every(chordName => {
				if (properlyNamedChordPrototypes.some(proto => proto.name === chordName)) return true
				return (Chord.parseChordString(chordName) !== undefined)
			})) {
				chordPrototypeConstraints.push(new ChordPrototypeOnlyFollowedByConstraint(protoIR.name, constantStringArrayGrabber(protoIR.allowedFollowingChords), true, true))
			}
		}
	}

	return { parsedChordPrototypes, chordPrototypeConstraints }
}

export function Output() {
	const [isPlaying, setIsPlaying] = useState(false)
	const appState = useAppContext()
	const { output, setOutput, onlyUseChordPrototypes, chordPrototypes, inferKey, inferMelodyKey, differentMelodyKey, numChords, chordOptionsPerCell, chordConstraintSet, melodyLength, noteOptionsPerCell, noteConstraintSet, minNumNotes, startOnNote, maxRestLength, useRhythm, sections, sectionOptionsPerCell, numSections, bpm} = appState

	const noteCanvasProps: TileCanvasProps<OctavedNote> = {
		optionsPerCell: new OptionsPerCell(OctavedNote.all(), noteOptionsPerCell.transform(OctavedNote.multipleFromIRs)),
		constraints: new ConstraintSet(noteConstraintSet.map(noteConstraint => convertIRToNoteConstraint(noteConstraint))),
	}

	function parseSections(): [Section[], Constraint<Section>[]] {
		const parsedSections = []
		const sectionConstraints = []

		const properlyNamedSections = sections.map(section => {
			if (section.name !== "") return section
			const sectionName = `Section${section.id}`
			return { ...section, name: sectionName }
		})

		for (const sectionIR of properlyNamedSections) {
			parsedSections.push(sectionIRToSection(sectionIR, chordPrototypes, onlyUseChordPrototypes))

			if (sectionIR.restrictPrecedingSections) {
				if (sectionIR.allowedPrecedingSections.every(sectionName => {
					if (properlyNamedSections.some(section => section.name === sectionName)) return true
					return (Chord.parseChordString(sectionName) !== undefined)
				})) {
					sectionConstraints.push(new SectionOnlyPrecededByHardConstraint(sectionIR.name, constantStringArrayGrabber(sectionIR.allowedPrecedingSections), true, true))
				}
			}

			if (sectionIR.restrictFollowingSections) {
				if (sectionIR.allowedFollowingSections.every(sectionName => {
					if (properlyNamedSections.some(section => section.name === sectionName)) return true
					return (Chord.parseChordString(sectionName) !== undefined)
				})) {
					sectionConstraints.push(new SectionOnlyFollowedByHardConstraint(sectionIR.name, constantStringArrayGrabber(sectionIR.allowedFollowingSections), true, true))
				}
			}
		}

		return [parsedSections, sectionConstraints]
	}

	function updatePlayer() {
		const errors = errorsInAppState(appState)
		if (errors.length > 0) {
			alert(errors.join("\n"))
			return
		}
		let seed
		try {
			const {parsedChordPrototypes, chordPrototypeConstraints} = parseChordPrototypes(chordPrototypes)
			const [parsedSections, sectionConstraints] = parseSections()

			const chordesqueCanvasProps: TileCanvasProps<Chordesque> = {
				optionsPerCell: new OptionsPerCell([
					...parsedChordPrototypes,
					...(onlyUseChordPrototypes ? [] : Chord.allBasicChords()),
				], chordesqueIRMapToChordesqueMap(chordOptionsPerCell, chordPrototypes)),
				constraints: new ConstraintSet([...chordConstraintSet.map(chordConstraint => convertIRToChordConstraint(chordConstraint)), ...chordPrototypeConstraints]),
			}

			const sectionCanvasProps : TileCanvasProps<Section> = {
				optionsPerCell: new OptionsPerCell(parsedSections, sectionIRMapToSectionMap(sectionOptionsPerCell, sections, chordPrototypes, onlyUseChordPrototypes)),
				constraints: new ConstraintSet(sectionConstraints),
			}

			const inferredKey = inferKey()

			const decisionManager = new DecisionManager()
			const random = new Random()
			seed = random.getSeed()

			const node = new SectionLevelNode({
				noteCanvasProps,
				chordesqueCanvasProps,
				sectionCanvasProps,
				random,
				higherValues: {
					key: inferredKey, 
					melodyKey: differentMelodyKey ? inferMelodyKey() : inferredKey,
					bpm,
					useRhythm,
					numChords,
					numSections,
					melodyLength,
					rhythmPatternOptions: {
						minimumNumberOfNotes: minNumNotes,
						onlyStartOnNote: startOnNote,
						maximumRestLength: maxRestLength,
					},
				},
				position: 0,
				decisionManager
			})

			node.getCanvas().initialize()
			const resultManager = new ResultManager(node)
			BreadthFirstTraverser.generate(node, resultManager)
			const result = resultManager.generate()
			setOutput(entireResultToOutput(result, 0))
			
		} catch (e) {
			console.error(seed)
			console.error(e)
			alert(e)
		}
	}

	return <div style={{
			display: "flex",
			flexDirection:"row", 
			justifyContent:"center", 
			position: "fixed", 
			bottom:0,
			left:"50%",
			transform: "translateX(-50%)",
			height:"20vh", 
			border:"white 1px solid", 
			borderRadius:5, 
			padding:10, 
			backgroundColor: "rgba(0,0,0,0.75)",
			maxWidth:"90vw",
		}}>
		<MidiPlayer notes={output.notes} length={output.end} isPlaying={isPlaying} setIsPlaying={setIsPlaying} updatePlayer={updatePlayer}/>
	</div>
}