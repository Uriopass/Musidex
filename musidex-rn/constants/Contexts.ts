import {emptyMetadata, MusidexMetadata} from "../common/entity";
import React from "react";

export const MetadataCtx = React.createContext<[MusidexMetadata, () => void]>([emptyMetadata(), () => {
    return;
}]);

const Contexts = {};
export default Contexts;