import React, {useEffect, useRef} from 'react';
import API from "./api";

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
    <div className="App">
      <header className="App-header">
        <p ref={pRef}>

        </p>
      </header>
    </div>
  );
}

export default App;
