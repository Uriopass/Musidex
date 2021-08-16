import './explorer.css'

type ExplorerProps = {
    title: string;
}

const Explorer = (props: ExplorerProps) => {
    return (
        <div className="explorer color-fg">
            <div className="explorer-title">{props.title}</div>
        </div>
    )
}

export default Explorer;