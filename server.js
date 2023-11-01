const express = require('express')
const app = express()
const PORT = process.env.PORT || 8080
app.use(express.static('EIP712Web3Demo'));

app.listen(PORT, () => {
    console.log(`Server is running on port : ${PORT}`)
})
module.exports = app