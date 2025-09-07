import app from './app.js'

app.get('/', (_, res)=>{
    res.json({data: 'hey i am good'})
})

app.listen(5000, ()=>{
    console.log('app connected successfully')
})