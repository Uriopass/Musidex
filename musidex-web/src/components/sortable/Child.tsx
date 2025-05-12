import {ListChildComponentProps} from "react-window";
import {default as React, useCallback, useContext} from "react";
import {DragContext, MouseEvent, SortableContext} from "./index";

export function Child(props: ListChildComponentProps) {
    let {style, index, ...rest} = props;

    const sortable = useContext(SortableContext);
    const {onMouseDown} = sortable;
    const mouseDown = useCallback((e: MouseEvent) => onMouseDown(e, props), [
        props,
        onMouseDown,
    ]);
    const drag = useContext(DragContext);

    if (drag !== null && index === drag.dragging.index) {
        return null;
    }

    let key: any;
    if (sortable.itemKey) key = sortable.itemKey(props.index, props.data);

    return (
        <sortable.Child
            {...rest}
            key={key}
            style={style}
            index={index}
            onSortMouseDown={mouseDown}
        />
    );
}