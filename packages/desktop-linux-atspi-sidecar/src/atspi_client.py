import pyatspi
import logging
from typing import Dict, Any, List

logger = logging.getLogger('atspi-client')

class AtspiClient:
    def __init__(self):
        self.registry = pyatspi.Registry

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "platform": "linux",
            "driver": "atspi",
            "version": "0.1.0",
            "actions": ["click", "type", "snapshot"],
            "native": True
        }

    def snapshot(self, includeTree: bool = True, includeScreenshot: bool = False, includeTextIndex: bool = False) -> Dict[str, Any]:
        logger.info("Taking snapshot")
        
        # Get root desktop
        desktop_count = self.registry.getDesktopCount()
        if desktop_count == 0:
             return {"tree": None, "driver": self.get_capabilities()}

        root = self.registry.getDesktop(0)
        
        tree = None
        if includeTree:
            tree = self._serialize_node(root)

        return {
            "tree": tree,
            "screenshot": None, # Not implemented yet
            "textIndex": None,
            "driver": self.get_capabilities()
        }
    
    def _serialize_node(self, accessible, path_prefix="", depth=0, max_depth=50) -> Dict[str, Any]:
        if depth > max_depth:
             return {"role": "recursion_limit"}

        try:
            role_name = accessible.getRoleName()
            name = accessible.name
            description = accessible.description
            
            # Helper to get states
            try:
                states_set = accessible.getState()
                states = states_set.getStates()
                # Simplified state map
                state_dict = {
                     "enabled": pyatspi.STATE_ENABLED in states,
                     "visible": pyatspi.STATE_VISIBLE in states,
                     "focused": pyatspi.STATE_FOCUSED in states,
                }
            except:
                state_dict = {}

            # Helper to get component bounds
            bounds = None
            try:
                component = accessible.queryComponent()
                if component:
                    x, y, w, h = component.getExtents(pyatspi.DESKTOP_COORDS)
                    bounds = {"x": x, "y": y, "w": w, "h": h}
            except:
                pass
            
            # Current Path
            index = accessible.getIndexInParent()
            # If path_prefix is empty, we are at root. But root index is usually 0 for desktop(0)
            # We'll treat the path as a slash-separated string of indices
            current_path = f"{path_prefix}/{index}" if path_prefix else str(index)

            # Children
            children = []
            child_count = accessible.childCount
            # Limit child count for perf?
            for i in range(min(child_count, 1000)):
                try:
                    child = accessible.getChildAtIndex(i)
                    if child:
                        children.append(self._serialize_node(child, current_path, depth + 1, max_depth))
                except Exception as e:
                     # logger.warning(f"Error getting child {i}: {e}")
                     pass

            node = {
                "role": role_name,
                "name": name,
                "description": description,
                "states": state_dict,
                "platformIds": {
                    "atspiPath": current_path
                },
                "children": children
            }
            if bounds:
                node["location"] = bounds
            
            return node

        except Exception as e:
            logger.error(f"Error serializing node: {e}")
            return {"role": "error", "name": str(e)}

    def _resolve_path(self, path_str: str):
        try:
            indices = [int(x) for x in path_str.split('/')]
            # Assuming first index corresponds to desktop index, usually 0
            if not indices: return None
            
            acc = self.registry.getDesktop(indices[0])
            for i in indices[1:]:
                acc = acc.getChildAtIndex(i)
            return acc
        except Exception as e:
            logger.error(f"Failed to resolve path {path_str}: {e}")
            return None

    def click(self, target: str, x: int = 0, y: int = 0) -> Dict[str, Any]:
        # target format: "atspi:path=0/1/2"
        if not target.startswith("atspi:path="):
             return {"status": "error", "message": "Invalid target format"}
        
        path_str = target.split("=", 1)[1]
        acc = self._resolve_path(path_str)
        if not acc:
             return {"status": "error", "message": "Element not found"}

        try:
            # Try Action interface
            action = acc.queryAction()
            if action and action.nActions > 0:
                action.doAction(0) # Default action
                return {"status": "success", "message": "Clicked via Action interface"}
            
            # Fallback: Component interface (no click method, but maybe grab focus?)
            component = acc.queryComponent()
            if component:
                 # TODO: Input injection for true click
                 component.grabFocus()
                 return {"status": "success", "message": "Grabbed focus (click not supported via Action)"}
            
            return {"status": "error", "message": "Element does not support Action or Component"}
        except Exception as e:
             return {"status": "error", "message": f"Click failed: {e}"}


    def type(self, text: str, target: str = "") -> Dict[str, Any]:
        if target:
            if not target.startswith("atspi:path="):
                return {"status": "error", "message": "Invalid target format"}
            path_str = target.split("=", 1)[1]
            acc = self._resolve_path(path_str)
            if acc:
                try:
                    component = acc.queryComponent()
                    if component: component.grabFocus()
                except:
                    pass
        
        # Generate keys
        try:
             pyatspi.Registry.generateKeyboardEvent(0, text, key_synth_type=pyatspi.KEY_STRING_SYNTH)
             return {"status": "success"}
        except Exception as e:
             return {"status": "error", "message": f"Type failed: {e}"}
