import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          PDF Annotation Viewer
        </h1>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Load a PDF and import annotations to get started
          </p>
          <button
            onClick={() => setCount((count) => count + 1)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
