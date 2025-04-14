import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ScholarAuthor from './components/Searchfun'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <ScholarAuthor/>
    </>
  )
}

export default App
