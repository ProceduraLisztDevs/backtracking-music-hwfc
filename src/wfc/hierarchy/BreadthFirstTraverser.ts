import { ConflictError } from "../Tile"
import { TileCanvas } from "../TileCanvas"
import { SectionLevelNode } from "./SectionLevelNode"
import { ResultManager } from "./results"

export class BreadthFirstTraverser {
    
    public static generate(sectionLevelNode: SectionLevelNode, resultManager: ResultManager) {
        sectionLevelNode.getCanvas().initialize()
        sectionLevelNode.getCanvas().generate()
        let lastCanvas: TileCanvas<any, any, any> = sectionLevelNode.getCanvas()

        for (let i = 0; i < sectionLevelNode.getSubNodes().length; i++){
            let found = false
            while(!found){
                try{
                    sectionLevelNode.getSubNodes()[i].getCanvas().initialize()
                    found = true
                } catch (e) {
                    if(!(e instanceof ConflictError)) throw e
                    lastCanvas.tryAnother()
                }
            }
        }

        for (let i = 0; i < sectionLevelNode.getSubNodes().length; i++){
            sectionLevelNode.getSubNodes()[i].getCanvas().generate()
            lastCanvas = sectionLevelNode.getSubNodes()[i].getCanvas()
        }

        for (let i = 0; i < sectionLevelNode.getSubNodes().length; i++){

            for (let j = 0; j < sectionLevelNode.getSubNodes()[i].getCanvas().getSize(); j++){
                let found = false
                while(!found){
                    try{
                        sectionLevelNode.getSubNodes()[i].getSubNodes()[j].getCanvas().initialize()
                        found = true
                    } catch (e) {
                        if(!(e instanceof ConflictError)) throw e
                        lastCanvas.tryAnother()
                    }
                }
                sectionLevelNode.getSubNodes()[i].getSubNodes()[j].getCanvas().generate()
                lastCanvas = sectionLevelNode.getSubNodes()[i].getSubNodes()[j].getCanvas()
               }
        }
    }
}
