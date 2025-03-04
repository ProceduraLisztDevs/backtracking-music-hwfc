import { Note } from "../../music_theory/Note"
import { Grabber, NoteGrabberIR } from "../Grabber"
import { HigherValues } from "../HigherValues"
import { constantNoteGrabber } from "./constantGrabbers"

export const RootOfChordGrabber : Grabber<Note | undefined> = (higherValues: HigherValues) =>
	higherValues.chord?.getRoot()

export const ThirdOfChordGrabber : Grabber<Note | undefined> = (higherValues: HigherValues) =>
	higherValues.chord?.getThird()

export const FifthOfChordGrabber : Grabber<Note | undefined> = (higherValues: HigherValues) =>
	higherValues.chord?.getFifth()

export const noteGrabberIRToGrabber = (ir: NoteGrabberIR): Grabber<Note | undefined> => {
	switch (ir) {
		case "RootOfChordGrabber": return RootOfChordGrabber
		case "ThirdOfChordGrabber": return ThirdOfChordGrabber
		case "FifthOfChordGrabber": return FifthOfChordGrabber
		default: return constantNoteGrabber(ir.value)
	}
}