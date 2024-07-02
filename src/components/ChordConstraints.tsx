import { useState } from "react"
import { ChordConstraintIR, ChordConstraintType, chordConstraintOptions, chordConstraintTypeToName, initializeChordConstraint } from "../wfc/constraints/constraintUtils"
import { useAppContext } from "../AppState"
import Select from "react-select"
import { selectStyles } from "../styles"
import { SimpleConstraintConfigDiv } from "./SimpleConstraintConfigDiv"
import { H4tooltip } from "./tooltips"

interface ChordConstraintConfigProps {
	constraintIR: ChordConstraintIR
	onConstraintChange: (updatedIR: ChordConstraintIR) => void
	setValid: (valid: boolean) => void
}

export function ChordConstraintConfig({ constraintIR, onConstraintChange, setValid }: ChordConstraintConfigProps) {
	switch (constraintIR.type) {
		case "ChordInKeyHardConstraint": return <></>
		case "ChordRootAbsoluteStepSizeHardConstraint":

			return <SimpleConstraintConfigDiv>
				<div style={{ display: "flex", flexDirection: "row", gap: "0.5em", flexWrap: "wrap", justifyContent: "center" }}>
					{[0, 1, 2, 3, 4, 5, 6].map(num => (
						<div key={num} style={{ display: "flex", flexDirection: "column" }}>
							<input
								type="checkbox"
								defaultChecked={constraintIR.stepSizes.includes(num)}
								onChange={(e) => {
									const stepSizes = [...constraintIR.stepSizes]
									if (e.target.checked) stepSizes.push(num)
									else stepSizes.splice(stepSizes.indexOf(num), 1)
									onConstraintChange({ ...constraintIR, stepSizes })
									setValid(stepSizes.length > 0)
								}}
							/>
							{num}
						</div>
					))}
				</div>
				{ChordReachOverPanel(constraintIR, onConstraintChange)}
			</SimpleConstraintConfigDiv>
		case "PerfectCadenceSoftConstraint": return <SimpleConstraintConfigDiv>
			<input
				type="number"
				placeholder="Boost value"
				min={1}
				defaultValue={constraintIR.bonus}
				onChange={(e) => {
					const bonus = parseInt(e.target.value)
					if (bonus > 0) {
						setValid(true)
						onConstraintChange({ ...constraintIR, bonus })
					}
					else setValid(false)
				}}
			/>
			{ChordReachOverPanel(constraintIR, onConstraintChange)}
		</SimpleConstraintConfigDiv>
		case "PlagalCadenceSoftConstraint": return <SimpleConstraintConfigDiv>
			<input
				type="number"
				placeholder="Boost value"
				min={1}
				defaultValue={constraintIR.bonus}
				onChange={(e) => {
					const bonus = parseInt(e.target.value)
					if (bonus > 0) {
						setValid(true)
						onConstraintChange({ ...constraintIR, bonus })
					}
					else setValid(false)
				}}
			/>
			{ChordReachOverPanel(constraintIR, onConstraintChange)}
		</SimpleConstraintConfigDiv>
	}
}

interface ChordConstraintDivProps {
	constraintIR: ChordConstraintIR
	onConstraintChange: (updatedIR: ChordConstraintIR) => void
	onRemove: () => void
}

function ChordReachOverPanel(constraintIR: ChordConstraintIR & { reachOverPrev: boolean; reachOverNext: boolean }, onConstraintChange: (updatedIR: ChordConstraintIR & { reachOverPrev: boolean; reachOverNext: boolean }) => void) {
	return <div style={{ display: "flex", flexDirection: "column", gap: "0.5em", flexWrap: "wrap", justifyContent: "left", marginTop: "2em", textAlign:"left" }}>
		<div style={{ display: "flex", flexDirection: "row", gap: "0.5em", justifyContent:"flex-start"}}>
			<input
				type="checkbox"
				id="reachOverPrev"
				name="reachOverPrev"
				defaultChecked={constraintIR.reachOverPrev}
				onChange={(e) => {
					onConstraintChange({ ...constraintIR, reachOverPrev: e.target.checked })
				} } />
			<label htmlFor="reachOverPrev" style={{justifyContent: "left"}}>Reach over into previous canvas</label>
		</div>
		<div style={{ display: "flex", flexDirection: "row", gap: "0.5em", justifyContent:"flex-start"}}>
			<input
				type="checkbox"
				id="reachOverNext"
				name="reachOverNext"
				defaultChecked={constraintIR.reachOverNext}
				onChange={(e) => {
					onConstraintChange({ ...constraintIR, reachOverNext: e.target.checked })
				} } />
			<label htmlFor="reachOverNext">Reach over into next canvas</label>
		</div>
	</div>
}

export function ChordConstraintDiv({ constraintIR, onConstraintChange, onRemove }: ChordConstraintDivProps) {
	const [valid, setValid] = useState(constraintIR.validByDefault as boolean)

	const chordConstraintReadable = chordConstraintTypeToName.get(constraintIR.type)!

	return <div className="constraint-div">
		<div style={{ display: "flex", justifyContent: "end", gap: "0.5em", flexDirection: "row", alignItems: "center", fontSize: 8 }}>
			<button style={{ width: "fit-content", height: "fit-content" }} onClick={onRemove}>X</button>
		</div>
		{
			chordConstraintReadable.hint ?
			<H4tooltip title={chordConstraintReadable!.name} hint={chordConstraintReadable!.hint} style={{ color: valid ? "white" : "red", marginTop: 0 }}/> :
			<h4 style={{ color: valid ? "white" : "red", marginTop: 0 }}>{chordConstraintReadable.name}</h4>
		}
		<ChordConstraintConfig constraintIR={constraintIR} onConstraintChange={onConstraintChange} setValid={setValid} />
	</div>
}

type ChordConstraintTypeOption = { value: ChordConstraintType, label: string }

interface AddChordConstraintProps {
	onAddConstraint: (constraintIR: ChordConstraintIR) => void
}

function AddChordConstraint({ onAddConstraint }: AddChordConstraintProps) {
	const { chordConstraintSet } = useAppContext()
	const [selectedType, setSelectedType] = useState<ChordConstraintTypeOption | null>(null)

	const getChordConstraintOptions = () => chordConstraintOptions.filter(option => !chordConstraintSet.map(constraint => constraint.type).includes(option.value)).map(option => ({ value: option.value, label: option.label.name }))

	const handleAddButtonClick = () => {
		if (!selectedType) return

		onAddConstraint(initializeChordConstraint(selectedType.value))
		setSelectedType(null)
	}

	return (
		<div className="add-constraint">
			<div style={{ flex: 1 }}>
				<Select
					options={getChordConstraintOptions()}
					value={selectedType}
					placeholder="Chord constraints..."
					onChange={(option) => setSelectedType(option || null)}
					styles={selectStyles}
				/>
			</div>
			<button onClick={() => { handleAddButtonClick(); setSelectedType(null) }}>Add</button>
		</div>
	)
}

export function ChordConstraints() {
	const { chordConstraintSet, addChordConstraint, removeChordConstraint, handleChordConstraintChange } = useAppContext()

	return (
		<>
			<h3>Chord constraints</h3>
			<AddChordConstraint onAddConstraint={addChordConstraint} />
			{chordConstraintSet.map((constraintIR, index) => {
				return <ChordConstraintDiv
					key={index}
					constraintIR={constraintIR}
					onConstraintChange={(updatedIR) => handleChordConstraintChange(index, updatedIR)}
					onRemove={() => removeChordConstraint(index)}
				/>
			})}
		</>
	)
}
