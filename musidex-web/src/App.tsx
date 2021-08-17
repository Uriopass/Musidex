import React, {useEffect, useRef} from 'react';
import API from "./api";
import Navbar from "./components/navbar";
import Explorer from "./components/explorer";

function App() {
    let pRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        API.getMetadata().then((metadata) => {
            if (metadata == null) return;
            if (pRef.current == null) return;
            pRef.current.textContent = JSON.stringify(metadata, undefined, 2);
        })
    });

  return (
    <div className="color-bg bg" style={{textAlign: "center"}}>
        <Navbar />

        <div className="container">
            <Explorer title="salut"/>
        </div>
    </div>
  );
}

export default App;
