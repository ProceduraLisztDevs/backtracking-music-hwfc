import MidiWriter, { Pitch } from "midi-writer-js"
import { OctavedNote } from "../music_theory/Note"
import {
	ChordResult,
	EntireResult,
	SectionResult,
} from "../wfc/hierarchy/results"
import { Chord } from "../music_theory/Chord"
import { durationOfRhythmPattern } from "../music_theory/Rhythm"
import { NoteOutput } from "../components/MidiPlayer"

export type Output = {
	notes: NoteOutput[]
	end: number
}

const baseDuration = (bpm: number) =>  60 / bpm

function noteToPitch(note: OctavedNote): Pitch {
	return `${note.getNote()}${note.getOctave()}`
}

function chordToMidi(
	chord: Chord,
	duration: number,
	in_track?: MidiWriter.Track,
): MidiWriter.Track {
	const track = in_track ?? new MidiWriter.Track()

	track.addEvent(
		new MidiWriter.NoteEvent({
			pitch: [
				noteToPitch(new OctavedNote(chord.getRoot(), 2)),
				...chord
					.getNotes()
					.map((note) => noteToPitch(new OctavedNote(note, 3))),
			],
			duration: `T${duration * 128}`,
			sequential: false,
		}),
	)

	return track
}

function finishMidi(
	tracks: MidiWriter.Track[],
	setSrc: (url: string) => void,
): void {
	const writer = new MidiWriter.Writer(tracks)
	const file = writer.buildFile()

	const blob = new Blob([file], { type: "octet/stream" })
	const url = window.URL.createObjectURL(blob)

	setSrc(url)
}

export function chordResultToMidi(
	chordResult: ChordResult,
	setSrc: (url: string) => void,
) {
	const chordTrack = chordToMidi(
		chordResult.chord,
		durationOfRhythmPattern(chordResult.rhythmPattern),
	)

	const noteTrack = new MidiWriter.Track()

	let wait = 0
	let noteIndex = 0
	chordResult.rhythmPattern.getUnits().forEach((unit) => {
		if (unit.type == "note") {
			noteTrack.addEvent(
				new MidiWriter.NoteEvent({
					pitch: noteToPitch(
						chordResult.notes[noteIndex++],
					),
					duration: `T${unit.duration * 128}`,
					sequential: true,
					wait: `T${wait}`,
				}),
			)
			wait = 0
		} else {
			// unit.type == "rest"
			wait += unit.duration * 128
		}
	})

	finishMidi([chordTrack, noteTrack], setSrc)
}

export function chordResultsToMidi(
	chordResults: ChordResult[],
	setSrc: (url: string) => void,
) {
	const chordTrack = new MidiWriter.Track()
	const noteTrack = new MidiWriter.Track()

	let wait = 0
	chordResults.forEach((chordResult) => {
		chordToMidi(
			chordResult.chord,
			durationOfRhythmPattern(chordResult.rhythmPattern),
			chordTrack,
		)

		let noteIndex = 0
		chordResult.rhythmPattern.getUnits().forEach((unit) => {
			if (unit.type == "note") {
				noteTrack.addEvent(
					new MidiWriter.NoteEvent({
						pitch: noteToPitch(
							chordResult.notes[noteIndex++],
						),
						duration: `T${unit.duration * 128}`,
						sequential: true,
						wait: `T${wait}`,
					}),
				)
				wait = 0
			} else {
				// unit.type == "rest"
				wait += unit.duration * 128
			}
		})
	})

	finishMidi([chordTrack, noteTrack], setSrc)
}

function chordToNoteOutput(
	chord: Chord,
	startTime: number,
	duration: number,
): NoteOutput[] {
	const out: NoteOutput[] = []

	out.push({
		octavedNote: new OctavedNote(chord.getRoot(), 2),
		startTime,
		duration,
	})

	chord.getNotes().forEach((note) => {
		out.push({
			octavedNote: new OctavedNote(note, 3),
			startTime,
			duration,
		})
	})

	return out
}

export function chordResultToOutput(
	chordResult: ChordResult,
	offset: number,
): Output {
	const bpm = chordResult.bpm
	let time = offset
	let noteIndex = 0
	const out: NoteOutput[] = []
	chordResult.rhythmPattern.getUnits().forEach((unit) => {
		if (unit.type == "note") {
			out.push({
				octavedNote: chordResult.notes[noteIndex++],
				startTime: time,
				duration: unit.duration * baseDuration(bpm),
			})
		}
		time += unit.duration * baseDuration(bpm)
	})

	out.push(
		...chordToNoteOutput(
			chordResult.chord,
			offset,
			durationOfRhythmPattern(chordResult.rhythmPattern) *
				baseDuration(bpm),
		),
	)
	return {
		notes: out,
		end: time
	}
}


export function sectionResultToOutput(
	sectionResult: SectionResult,
	offset: number,
): Output {
	let time = offset
	const out: NoteOutput[] = []
	sectionResult.forEach((chord) => {
		const {notes, end} = chordResultToOutput(chord, time)
		out.push(...notes)
		time = end
	})
	return {
		notes: out,
		end: time
	}
}

export function entireResultToOutput(
	entireResult: EntireResult,
	offset: number,
): Output {
	let time = offset
	const out: NoteOutput[] = []
	entireResult.forEach((section) => {
		const {notes, end} = sectionResultToOutput(section, time)
		out.push(...notes)
		time = end
	})
	return {
		notes: out,
		end: time
	}
}
