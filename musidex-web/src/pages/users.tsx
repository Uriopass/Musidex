import './users.css'
import {useContext, useState} from "react";
import {User} from "../common/entity";
import {PageProps} from "./navigator";
import {EditableText, MaterialIcon} from "../components/utils";
import TextInput from "../components/input";
import API from "../common/api";
import {MetadataCtx} from "../domain/metadata";

export interface UsersProps extends PageProps {
    onSetUser: (id: number) => void;
    curUser?: number;
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
    return <div className={"user-card " + (props.isCurrent ? " user-card-current" : "")}
                onClick={() => props.onSelect(props.user.id)}
    >
        <div className="user-card-delete" onClick={() => props.onDelete(props.user.id)}>
            <MaterialIcon name="delete" size={20}/>
        </div>
        <EditableText text={props.user.name} onRename={(v) => props.onRename(props.user.id, v)}/>
    </div>;
}

export default Users;