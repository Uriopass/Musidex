import {default as React, useContext} from "react";
import {DragContext} from "./index";

export function DropZoneElement() {
    const drag = useContext(DragContext);
    if (drag === null) return null;

    const style = Object.assign({}, drag.dragging.style, {
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        zIndex: 2,
    });

    const dropElement = drag.dropElement || (
        <div
            style={{
                borderTop: "2px dashed #0087F7",
                marginLeft: "2px",
                marginRight: "2px",
                flex: 1,
                boxSizing: "border-box",
            }}
        />
    );

    return (
        <div ref={drag.dropZoneRef} style={style}>
            {dropElement}
        </div>
    );
}