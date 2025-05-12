import {default as React, useContext} from "react";
import {DragContext} from "./index";

export function DraggingElement() {
    const drag = useContext(DragContext);
    if (drag === null) return null;

    let {style, ...rest} = drag.dragging;
    const Child = drag.Child;

    style = Object.assign(
        {},
        style,
        {
            boxShadow: "1px 1px 5px 0px hsla(0, 0%, 0%, 0.31)",
            zIndex: 3,
            opacity: 0.5,
        },
        drag.draggingElementStyle || {}
    );

    if (!style.backgroundColor) style.backgroundColor = "white";

    return (
        <Child
            ref={drag.dragRef}
            {...rest}
            className={drag.draggingElementClassName}
            style={style}
            onSortMouseDown={() => {
            }}
        />
    );
}