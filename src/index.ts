const express = require('express');
import type { Application } from "express";  // working as we have set "esModuleInterop": true,

const app: Application = express();

const PORT = 5000;

app.get('/', (_, res)=>{
    res.json({response: "Congratulations your app successfully launched"})
})

app.listen(PORT, ()=>{
    console.log('App running !!')
})
