import * as React from "react";
import {createRef, CSSProperties, Ref, RefObject, useContext} from "react";
import {
    Align,
    FixedSizeList,
    FixedSizeListProps,
    ListChildComponentProps,
    ListItemKeySelector,
    ReactElementType,
} from "react-window";
import {Child} from "./Child";
import {DraggingElement} from "./DraggingElement";
import {DropZoneElement} from "./DropZoneElement";

export interface MouseEvent {
    preventDefault(): void;

    clientY: number;
}

export type ChildrenProps = ListChildComponentProps & {
    onSortMouseDown(e: MouseEvent): void;
    ref?: Ref<any>;
    className?: string;
};

export type Props<ListType> = {
    // a render function to render list items
    children: React.ComponentType<ChildrenProps>;

    // the distance from the top or bottom of the scroll
    // window where autoscroll should kick in
    autoScrollWhenDistanceLessThan?: number;

    // the speed at which the autoscroll should go
    autoScrollSpeed?: number;

    // set the class name for the element that is being
    // moved by the cursor
    draggingElementClassName?: string;

    // set override styles on the style prop for the element
    // being moved by the cursor
    draggingElementStyle?: CSSProperties;

    // a custom element to render as a spot where the dragged
    // element can be dropped.
    dropElement?: any;

    // a callback when a sort has completed
    onSortOrderChanged(params: { originalIndex: number; newIndex: number }): void;

    itemKey?: ListItemKeySelector;
} & Omit<ListType, "children">;

export interface State {
    dragging: null | ListChildComponentProps;
}

export type AutoScrollKeyword = "up" | "down" | "none";

export interface ScrollCompatibleList {
    scrollTo(scrollOffset: number): void;

    scrollToItem(index: number, align?: Align): void;
}

export type Timeout = any;

export class SortableFixedSizeList extends React.Component<
    Props<FixedSizeListProps>,
    State
> {
    dragRef: RefObject<HTMLElement> = createRef();
    dropZoneRef: RefObject<HTMLDivElement> = createRef();
    listRef: RefObject<ScrollCompatibleList> = createRef();

    startClientY: number = 0;
    startDragObjOffsetY: number = 0;
    hoverIndex: number | null = null;

    autoScroll: AutoScrollKeyword = "none";
    autoScrollTimer: Timeout | null = null;

    constructor(props: any) {
        super(props);

        this.state = {
            dragging: null,
        };

        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.mouseDown = this.mouseDown.bind(this);
    }

    getAutoScrollWhenDistanceLessThan() {
        return this.props.autoScrollWhenDistanceLessThan || 50;
    }

    getAutoScrollSpeed() {
        return this.props.autoScrollSpeed || 50;
    }

    componentWillUnmount(): void {
        document.body.removeEventListener("mouseup", this.onMouseUp);
        document.body.removeEventListener("mousemove", this.onMouseMove);
        this.setAutoScroll("none", 0, 0);
    }

    mouseDown(e: MouseEvent, params: ListChildComponentProps) {
        e.preventDefault();
        const list = this.listRef.current;
        if (list === null) return;

        this.startClientY = e.clientY;

        const top = parseInt((params.style.top || "0").toString(), 10);

        this.startDragObjOffsetY = top - this.getScrollOffsetTop(list);

        document.body.addEventListener("mouseup", this.onMouseUp);
        document.body.addEventListener("mousemove", this.onMouseMove);

        this.setState({
            dragging: params,
        });
    }

    onMouseMove(event: MouseEvent) {
        this.updateDragElementPositioning(event.clientY);
        this.checkAutoScroll(event.clientY);
    }

    updateDragElementPositioning(mouseY: number) {
        const dragRef = this.dragRef.current;
        if (dragRef === null) return;
        if (this.listRef.current === null) return;

        const scrollOffsetTop = this.getScrollOffsetTop(this.listRef.current);

        const dY = mouseY - this.startClientY;
        const newY = this.startDragObjOffsetY + dY + scrollOffsetTop;
        dragRef.style.top = newY + "px";

        const dropRef = this.dropZoneRef.current;
        if (dropRef === null) return;

        const {offsetTop, index} = this.getHoverDetails(newY);
        this.hoverIndex = index;
        dropRef.style.top = offsetTop + "px";
    }

    getHoverDetails(offsetY: number): { offsetTop: number; index: number } {
        let posY = 0;

        for (let i = 0; i < this.props.itemCount; i++) {
            const height = this.props.itemSize;

            if (offsetY < posY + height / 2) {
                return {
                    offsetTop: posY,
                    index: i,
                };
            }

            posY += height;
        }

        return {
            offsetTop: posY,
            index: this.props.itemCount,
        };
    }

    getScrollOffsetTop(list: ScrollCompatibleList): number {
        return this.getScrollRef(list).scrollTop;
    }

    getScrollRef(list: ScrollCompatibleList) {
        // @ts-ignore dangerously reach into list internals, so we can get a ref on the scroll element
        return list._outerRef as HTMLDivElement;
    }

    checkAutoScroll(mouseY: number) {
        if (this.listRef.current === null) return;

        const list = this.listRef.current as ScrollCompatibleList;
        const scrollRef = this.getScrollRef(list);

        const rect = scrollRef.getBoundingClientRect() as DOMRect;
        const listTop = rect.y;
        const listBottom = rect.y + rect.height;

        const buffer = this.getAutoScrollWhenDistanceLessThan();

        if (mouseY - listTop < buffer) {
            this.setAutoScroll("up", mouseY, 1.0 - (mouseY - listTop) / buffer);
        } else if (listBottom - mouseY < buffer) {
            this.setAutoScroll("down", mouseY, 1.0 - (listBottom - mouseY) / buffer);
        } else {
            this.setAutoScroll("none", mouseY, 0);
        }
    }

    setAutoScroll(scroll: AutoScrollKeyword, mouseY: number, coeff: number) {
        if (this.autoScrollTimer !== null) {
            clearInterval(this.autoScrollTimer);
            this.autoScrollTimer = null;
        }

        this.autoScroll = scroll;

        if (scroll === "none") return;

        if (this.dragRef.current === null) return;
        if (this.listRef.current === null) return;

        let delta = this.getAutoScrollSpeed() * coeff;
        if (scroll === "up") {
            delta = delta * -1;
        }

        let callback = (_: any) => {
            if (this.listRef.current === null) return;

            const offsetTop = this.getScrollOffsetTop(this.listRef.current);
            const newOffsetTop = offsetTop + delta;
            this.listRef.current.scrollTo(newOffsetTop);

            this.updateDragElementPositioning(mouseY);
        };
        callback({});
        this.autoScrollTimer = setInterval(callback, 16);
    }

    onMouseUp() {
        document.body.removeEventListener("mouseup", this.onMouseUp);
        document.body.removeEventListener("mousemove", this.onMouseMove);

        this.setAutoScroll("none", 0, 0);

        if (this.state.dragging === null) return;

        const startIndex = this.state.dragging.index;

        this.setState({
            dragging: null,
        });

        if (this.hoverIndex !== null) {
            let newIndex = this.hoverIndex;
            if (newIndex > startIndex) {
                newIndex = Math.max(0, newIndex - 1);
            }

            this.props.onSortOrderChanged({
                originalIndex: startIndex,
                newIndex: newIndex,
            });
        }

        this.hoverIndex = null;
    }

    renderDropZoneElement() {
        if (this.state.dragging === null) return;

        const style = Object.assign({}, this.state.dragging.style, {
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            zIndex: 2,
            background: "white",
        });

        const dropElement = this.props.dropElement || (
            <div
                style={{
                    border: "2px dashed #0087F7",
                    borderRadius: "3px",
                    margin: "2px",
                    flex: 1,
                    boxSizing: "border-box",
                }}
            />
        );

        return (
            <div ref={this.dropZoneRef} style={style}>
                {dropElement}
            </div>
        );
    }

    renderDraggingElement() {
        if (this.state.dragging === null) return null;

        let {style, ...rest} = this.state.dragging;
        const Child = this.props.children;

        style = Object.assign(
            {},
            style,
            {
                boxShadow: "1px 1px 5px 0px hsla(0, 0%, 0%, 0.31)",
                zIndex: 3,
            },
            this.props.draggingElementStyle || {}
        );

        if (!style.backgroundColor) style.backgroundColor = "white";

        return (
            <Child
                ref={this.dragRef}
                {...rest}
                className={this.props.draggingElementClassName}
                style={style}
                onSortMouseDown={(_: MouseEvent) => {
                }}
            />
        );
    }

    renderInnerElement() {
        const InnerElement = this.props.innerElementType;

        return React.forwardRef(({children, ...rest}, ref: Ref<any>) => {
            const inner = (
                <React.Fragment>
                    {children}
                    {this.renderDraggingElement()}
                    {this.renderDropZoneElement()}
                </React.Fragment>
            );

            if (InnerElement) {
                return (
                    <InnerElement {...rest} ref={ref}>
                        {inner}
                    </InnerElement>
                );
            }

            return (
                <div {...rest} ref={ref}>
                    {inner}
                </div>
            );
        });
    }

    sortableContext: ISortableContext = {
        Child: this.props.children,
        itemKey: this.props.itemKey,
        onMouseDown: this.mouseDown.bind(this),
    };

    getSortableContext() {
        const value = {
            Child: this.props.children,
            itemKey: this.props.itemKey,
            onMouseDown: this.mouseDown,
        };

        if (value.Child === this.sortableContext.Child) {
            if (value.itemKey === this.sortableContext.itemKey) {
                return this.sortableContext;
            }
        }

        this.sortableContext = value;
        return this.sortableContext;
    }

    dragContext: IDragContext | null = null;

    getDragContext() {
        if (!this.state.dragging) return null;

        let value: IDragContext = {
            dragging: this.state.dragging,
            dragRef: this.dragRef,
            dropZoneRef: this.dropZoneRef,
            Child: this.props.children,
        };

        if (
            this.dragContext === null ||
            this.dragContext.dragging !== value.dragging ||
            this.dragContext.Child !== value.Child
        ) {
            this.dragContext = value;
        }

        return this.dragContext;
    }

    render() {
        const {children, innerElementType, ...props} = this.props;

        return (
            <SortableContext.Provider value={this.getSortableContext()}>
                <InnerElementContext.Provider value={this.props.innerElementType}>
                    <DragContext.Provider value={this.getDragContext()}>
                        <FixedSizeList
                            ref={this.listRef as any}
                            innerElementType={InnerElementType}
                            {...props}
                        >
                            {Child}
                        </FixedSizeList>
                    </DragContext.Provider>
                </InnerElementContext.Provider>
            </SortableContext.Provider>
        );
    }
}

export interface ISortableContext {
    Child: React.ComponentType<ChildrenProps>;
    itemKey?: ListItemKeySelector;

    onMouseDown(e: MouseEvent, params: ListChildComponentProps): void;
}

export const SortableContext = React.createContext<ISortableContext>({
    Child: () => <div/>,
    onMouseDown: () => {
    },
    itemKey: undefined,
});

export interface IDragContext {
    dragging: ListChildComponentProps;
    dragRef: Ref<HTMLElement>;
    dropZoneRef: Ref<HTMLDivElement>;
    draggingElementClassName?: string;
    draggingElementStyle?: CSSProperties;
    dropElement?: any;
    Child: React.ComponentType<ChildrenProps>;
}

export const DragContext = React.createContext<IDragContext | null>(null);

const InnerElementContext = React.createContext<
    ReactElementType | undefined
>(undefined);

function InnerElementType(props: { children: any }) {
    const {children, ...rest} = props;
    const InnerElement = useContext(InnerElementContext);

    const inner = (
        <React.Fragment>
            {children}
            <DraggingElement/>
            <DropZoneElement/>
        </React.Fragment>
    );

    if (InnerElement) {
        return <InnerElement {...rest}>{inner}</InnerElement>;
    }

    return <div {...rest}>{inner}</div>;
}