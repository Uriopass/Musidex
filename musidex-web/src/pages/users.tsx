import './users.css'
import {useContext, useState} from "react";
import {MetadataCtx, User} from "../domain/entity";
import {PageProps} from "./navigator";
import {MaterialIcon} from "../components/utils";
import TextInput from "../components/input";
import API from "../domain/api";

export interface UsersProps extends PageProps {
    onSetUser: (id: number) => void;
    curUser: number;
}

const Users = (props: UsersProps) => {
    const [meta, metaSync] = useContext(MetadataCtx);
    const [newName, setNewName] = useState("");

    const onDelete = (id: number) => {
        API.deleteUser(id).then(() => metaSync());
    };

    const onRename = (id: number, newName: string) => {
        API.renameUser(id, newName).then(() => metaSync());
    };

    const onNewSubmit = () => {
        if (newName === "") {
            return;
        }
        API.createUser(newName).then(() => metaSync());
        setNewName("");
    };

    return (
        <div className={"scrollable-element content" + (props.hidden ? " hidden" : "")}>
            <div className="users color-fg ">
                {
                    meta.users.map((user) => {
                        return <UserCard key={user.id}
                                         user={user}
                                         isCurrent={props.curUser === user.id}
                                         onSelect={props.onSetUser}
                                         onDelete={onDelete}
                                         onRename={onRename}/>;
                    })
                }
            </div>
            <div className="user-add">
                <b>Create user</b>
                <TextInput onChange={setNewName} withLabel={true} name="User Name" title="User Name"/>
                <div className="user-add-submit" onClick={onNewSubmit}>Submit</div>
            </div>
        </div>
    )
}

type UserCardProps = {
    user: User;
    onSelect: (id: number) => void;
    onDelete: (id: number) => void;
    onRename: (id: number, newName: string) => void;
    isCurrent: boolean;
}

const UserCard = (props: UserCardProps) => {
    const [renaming, setRenaming] = useState(false);
    const [newName, setNewName] = useState("");

    let style = {};
    if (renaming) {
        style = {display: "flex", flexDirection: "column"};
    }

    return <div className={"user-card " + (props.isCurrent ? " user-card-current" : "")}
                onClick={() => props.onSelect(props.user.id)}
                style={style}
    >
        <div className="user-card-delete" onClick={() => props.onDelete(props.user.id)}>
            <MaterialIcon name="delete" size={20}/>
        </div>
        {(!renaming &&
            <>
                {props.user.name}
                <div className="user-card-rename" onClick={() => {
                    setRenaming(true);
                }}>
                    <MaterialIcon name="edit" size={20}/>
                </div>
            </>)
        }

        <div style={{display: (!renaming ? "none" : "flex"), flexDirection: "column", alignItems: "center"}}>
            <TextInput withLabel={true} name="Name" title="Name" onChange={setNewName}/>
            <div style={{display: "flex"}}>
                <div className="user-card-rename" onClick={() => {
                    setRenaming(false);
                    setNewName("");
                }}>
                    <MaterialIcon name="cancel" size={20}/>
                </div>
                <div className="user-card-rename-ok" onClick={() => {
                    props.onRename(props.user.id, newName);
                    setRenaming(false);
                    setNewName("");
                }
                }>
                    <MaterialIcon name="check" size={20}/>
                </div>
            </div>
        </div>
    </div>
}

export default Users;