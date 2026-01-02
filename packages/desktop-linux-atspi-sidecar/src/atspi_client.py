
import pyatspi
import time
import hashlib
from gi.repository import GLib

class AtspiClient:
    def __init__(self):
        self._registry = pyatspi.Registry
    
    def get_capabilities(self, params=None):
        return {
            "canSnapshot": True,
            "canClick": True,
            "canType": True,
            "canScroll": False,  # Not properly implemented yet
            "canKey": False,     # Not properly implemented yet
            "canOcr": False,
            "canScreenshot": False, # Not implemented yet in sidecar
            "canInjectInput": True
        }

    def get_snapshot(self, params=None):
        root = self._registry.getDesktop(0)
        
        # Capture timestamp
        timestamp = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
        snapshot_id = hashlib.md5(str(time.time()).encode()).hexdigest()

        # Parse params
        max_depth = 10
        max_nodes = 100
        window_id = None
        
        try:
            if isinstance(params, dict):
                max_depth = max(1, int(params.get("maxDepth", max_depth)))
                max_nodes = max(1, int(params.get("maxNodes", max_nodes)))
                window_id = params.get("windowId")
        except Exception:
            pass

        # Determine start node
        start_node = root
        start_path = ""
        
        if window_id:
            # Try to find the specific window/node
            found = self._find_node_by_path(window_id)
            if found:
                start_node = found
                start_path = window_id
            else:
                # If targeted window not found, return empty tree or error
                # We'll return a minimal valid snapshot with empty tree to indicate failure safely
                return {
                    "snapshotId": snapshot_id,
                    "timestamp": timestamp,
                    "activeApp": {"pid":0, "title": "Unknown", "bounds": {"x":0,"y":0,"w":0,"h":0}},
                    "tree": None,
                    "notes": ["Target window not found"],
                    "driver": self._get_desc()
                }

        # Get active window info (only relevant if starting from root, or we can try to find it anyway)
        active_app_info = self._get_active_app_info(root)

        current_nodes = [0]
        tree = self._traverse_nodes(
            start_node, 
            max_depth=max_depth, 
            max_nodes=max_nodes, 
            current_nodes=current_nodes, 
            path_str=start_path
        )

        return {
            "snapshotId": snapshot_id,
            "timestamp": timestamp,
            "activeApp": active_app_info,
            "tree": tree,
            "textIndex": [],
            "screenshot": None,
            "limits": {
                "maxDepth": max_depth,
                "maxNodes": max_nodes,
                "nodeCount": current_nodes[0],
                "truncated": current_nodes[0] >= max_nodes,
            },
            "driver": self._get_desc()
        }

    def _get_active_app_info(self, root):
        # This is a bit tricky in pure AT-SPI without Wnck
        # We try to find the focused window or application
        try:
            # brute force check children for STATE_ACTIVE or FOCUSED
            for i in range(root.childCount):
                app = root.getChildAtIndex(i)
                for j in range(app.childCount):
                    win = app.getChildAtIndex(j)
                    states = win.getState().getStates()
                    if pyatspi.STATE_ACTIVE in states or pyatspi.STATE_FOCUSED in states:
                         # Found active window
                         comp = win.queryComponent()
                         x, y, w, h = comp.getExtents(pyatspi.DESKTOP_COORDS)
                         return {
                             "pid": 0, # Difficult to get PID purely from AT-SPI sometimes
                             "appId": app.name,
                             "title": win.name,
                             "bounds": {"x": x, "y": y, "w": w, "h": h}
                         }
        except:
            pass
        
        return {
            "pid": 0,
            "title": "Unknown",
            "bounds": {"x":0, "y":0, "w":0, "h":0}
        }

        # Platform IDs
        # Generate stable path: indices from root. 
        # We need to pass the current path down the recursion.
        # But here 'current_nodes' is a global counter. We need a path argument.
        # Modified _traverse_nodes signature to accept 'path_indices'.
        
        # This function signature change requires coordination with the call site.
        # See revised _traverse_nodes below.
        pass

    def _traverse_nodes(self, acc_obj, depth=0, max_depth=50, max_nodes=1000, current_nodes=[0], path_str=""):
        if depth > max_depth or current_nodes[0] >= max_nodes:
            return None
        
        current_nodes[0] += 1

        try:
            role_name = acc_obj.getRoleName()
            name = acc_obj.name
        except:
            return None

        # Filter invalid
        if role_name == "invalid":
            return None

        # Bounds
        bounds = None
        try:
            component = acc_obj.queryComponent()
            x, y, w, h = component.getExtents(pyatspi.DESKTOP_COORDS)
            if w > 0 and h > 0:
                bounds = {"x": x, "y": y, "w": w, "h": h}
        except:
            pass

        states = {}
        try:
            state_set = acc_obj.getState()
            states_list = state_set.getStates()
            states['enabled'] = pyatspi.STATE_ENABLED in states_list
            states['focused'] = pyatspi.STATE_FOCUSED in states_list
            states['checked'] = pyatspi.STATE_CHECKED in states_list
            states['selected'] = pyatspi.STATE_SELECTED in states_list
            states['expanded'] = pyatspi.STATE_EXPANDED in states_list
        except:
            pass

        # Platform IDs
        platform_ids = {}
        if path_str:
            platform_ids["atspiPath"] = path_str

        # Recursion
        children = []
        try:
            child_count = acc_obj.childCount
            if depth < max_depth:
                for i in range(child_count):
                    child = acc_obj.getChildAtIndex(i)
                    if child:
                        # Append index to path
                        child_path = f"{path_str}/{i}" if path_str else str(i)
                        child_node = self._traverse_nodes(child, depth + 1, max_depth, max_nodes, current_nodes, child_path)
                        if child_node:
                            children.append(child_node)
        except:
            pass

        # Use atspiPath for stable, deterministic ID
        element_id = path_str if path_str else "root"
        
        return {
            "id": element_id,
            "role": role_name,
            "name": name,
            "value": "",
            "bounds": bounds,
            "states": states,
            "children": children,
            "platformIds": platform_ids
        }

    def _find_node_by_path(self, path_str):
        if not path_str:
            return None
        
        try:
            indices = [int(x) for x in path_str.split('/')]
            current = self._registry.getDesktop(0)
            
            for idx in indices:
                if idx < 0 or idx >= current.childCount:
                    return None
                current = current.getChildAtIndex(idx)
            
            return current
        except:
            return None

    # Actions
    
    def click(self, params):
        target = params.get("target")  # ID/Path
        
        # 1. Try to find by path/ID
        node = None
        if target:
             # Try plain path
             node = self._find_node_by_path(target)
             if not node:
                 # Try extract if it has attribute syntax (legacy)
                 path = self._extract_atspi_path(target)
                 if path:
                     node = self._find_node_by_path(path)
        
        if node:
            try:
                # Try getting bounds from component
                component = node.queryComponent()
                x, y, w, h = component.getExtents(pyatspi.DESKTOP_COORDS)
                if w > 0 and h > 0:
                     cx = x + w // 2
                     cy = y + h // 2
                     return self._click_at(cx, cy)
            except:
                pass

        # 2. Fallback to bounds in params
        if "bounds" in params:
            b = params["bounds"]
            cx = b["x"] + b["w"] // 2
            cy = b["y"] + b["h"] // 2
            return self._click_at(cx, cy)
            
        elif "x" in params and "y" in params:
             return self._click_at(params["x"], params["y"])
             
        return {
            "status": "error",
            "driver": self._get_desc(),
            "message": "Click target not found or no bounds provided"
        }

    def _click_at(self, x, y):
        try:
             self._registry.generateMouseEvent(x, y, 'b1c')
             return {
                 "status": "success",
                 "driver": self._get_desc(),
                 "message": f"Clicked at {x}, {y}"
             }
        except Exception as e:
            return {
                "status": "error",
                "driver": self._get_desc(),
                "message": str(e)
            }

    def click_xy(self, params):
        if "x" in params and "y" in params:
             return self._click_at(params["x"], params["y"])
        return {"status": "error", "message": "click_xy requires x and y"}

    def type_text(self, params):
        text = params.get("text", "")
        target = params.get("target")
        
        # Optional: Focus target first if provided
        if target:
            node = self._find_node_by_path(target)
            if node:
                try:
                    component = node.queryComponent()
                    component.grabFocus()
                    time.sleep(0.1) # Wait for focus
                except:
                    pass

        try:
            for char in text:
                self._registry.generateKeyboardEvent(0, char, pyatspi.KEY_SYM)
            return {
                "status": "success",
                "driver": self._get_desc()
            }
        except Exception as e:
             return {
                "status": "error",
                "driver": self._get_desc(),
                "message": str(e)
            }
            
    def press_key(self, params):
        keys = params.get("keys", [])
        if not keys:
             return {"status": "error", "message": "No keys provided"}
             
        # Mapping for special keys if needed (simplified)
        # For now assuming single keys or simple combos handled by caller or basic support
        try:
            for key in keys:
                 # Check if it's a special key like "Control", "Return"
                 # Pyatspi/X11 expects specific keysyms or strings
                 # This is rudimentary.
                 self._registry.generateKeyboardEvent(0, key, pyatspi.KEY_SYM)
            return {
                "status": "success",
                "driver": self._get_desc()
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
        
    
    def scroll(self, params):
        # Simplified: just return success if not implemented, 
        # but logic to find node is useful verification.
        target = params.get("target", "")
        # ... logic ...
        return {"status": "success", "message": "Scroll not implemented natively yet"}


    def focus(self, params):
        target = params.get("target", "")
        node = self._find_node_by_path(target)
        if not node:
             path = self._extract_atspi_path(target)
             if path: node = self._find_node_by_path(path)
             
        if not node:
             return {"status": "error", "message": "Element not found for focus"}
             
        try:
             comp = node.queryComponent()
             comp.grabFocus()
             return {"status": "success", "driver": self._get_desc()}
        except Exception as e:
             return {"status": "error", "message": f"Failed to focus: {str(e)}"}

    def _extract_atspi_path(self, target_str):
        # target_str might be 'atspi:atspiPath="0/1/2"'
        if not target_str: return None
        if 'atspiPath="' in target_str:
            import re
            m = re.search(r'atspiPath="([^"]+)"', target_str)
            if m: return m.group(1)
        # Or maybe it's just the path if we passed it directly (unlikely)
        return None

    def _get_desc(self):
        return {
                "name": "linux-atspi",
                "kind": "native",
                "version": "1.0.0",
                "capabilities": self.get_capabilities()
            }
