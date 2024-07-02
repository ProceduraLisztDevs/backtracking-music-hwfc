import { Canvasable } from "../../util/utils"
import { TileCanvas } from "../TileCanvas"
import { DecisionManager } from "./backtracking"
import { Result } from "./results"

export abstract class HWFCNode<P extends Canvasable<P>, T extends Canvasable<T>, C extends Canvasable<C>> {
    protected parent?: HWFCNode<any,P,T>
    protected abstract canvas: TileCanvas<P, T, C>
    protected abstract position: number
    protected abstract subNodes: HWFCNode<T, C, any>[]
    protected abstract decisionManager: DecisionManager

    public getParent(): HWFCNode<any,P,T> | undefined {
        return this.parent
    }

    public getCanvas(): TileCanvas<P, T, C> {
        return this.canvas
    }

    public getLevel() {
        return this.canvas.getLevel()
    }

    public getPosition(): number {
        return this.position
    }

    public getSubNodes(): HWFCNode<T, C, any>[] {
        return this.subNodes
    }

    public createSubNodes() {
        for (let i = 0; i < this.canvas.getSize(); i++) {
            if(i == this.subNodes.length){
                this.subNodes.push(this.createChildNode(i)!)
            } else if (i < this.subNodes.length){
                this.resetSubNodeAt(i)
            } else {
                throw new Error("This should be sequential")
            }
        }
    }

    public setSubNodeAt(position: number, newSubNode: HWFCNode<T, C, any>){
        this.subNodes[position] = newSubNode
    }

    public resetSubNodeAt(position: number) {
        this.setSubNodeAt(position, this.createChildNode(position)!)
    }

    public abstract mergeResults(subResults: Result<T>[]): Result<P>

    public abstract createChildNode(position: number): HWFCNode<T,C,any> | undefined
}