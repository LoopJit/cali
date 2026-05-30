import './style.css'
import {setBackground} from './background.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="background"></section>
<div id="title">
    <b>MEOW</b>
</div>
<div class="dialogbox" id="dialog1">
    <b>Olaaa <33</b>
</div>
`


//@ts-ignore
const cleanup = setBackground(document.querySelector('#background')!, '/models/Cat.glb');
//cleanup()
