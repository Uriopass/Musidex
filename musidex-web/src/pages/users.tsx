import './users.css'
import {useContext, useState} from "react";
import {User} from "../common/entity";
import {Page, PageProps} from "./navigator";
import {EditableText, MaterialIcon} from "../components/utils";
import TextInput from "../components/input";
import API from "../common/api";
import {MetadataCtx} from "../domain/metadata";
import {Setter} from "../../../musidex-ts-common/utils";
import {SearchFormCtx} from "../App";

export interface UsersProps extends PageProps {
    onSetUser: (id: number) => void;
    curUser?: number;
    page: Page,
    setCurPage: Setter<Page>;
}

const Users = (props: UsersProps) => {
    const [meta, metaSync] = useContext(MetadataCtx);
    const [sform, setSform] = useContext(SearchFormCtx);
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

    const onSelectUser = (user: number) => {
        props.onSetUser(user);
        props.setCurPage({...props.page, path: "explorer"});
        setSform({
            ...sform,
            filters: {
                ...sform.filters,
                user: user,
            }
        })
    };

    return (
        <div className={"scrollable-element content" + (props.hidden ? " hidden" : "")}>
            <div className="users color-fg ">
                {
                    meta.users.map((user) => {
                        return <UserCard key={user.id}
                                         user={user}
                                         isCurrent={props.curUser === user.id}
                                         onSelect={onSelectUser}
                                         onDelete={onDelete}
                                         onRename={onRename}/>;
                    })
                }
            </div>
            <div className="user-add">
                <b>Create user</b>
                <TextInput onChange={setNewName} value={newName} withLabel={true} name="User Name" title="User Name"/>
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
        <div className="user-card-name">
            <EditableText text={props.user.name} onRename={(v) => props.onRename(props.user.id, v)}/>
        </div>
        <div className="user-card-delete" onClick={() => props.onDelete(props.user.id)}>
            <MaterialIcon name="delete" size={20}/>
        </div>
    </div>;
}

export default Users;