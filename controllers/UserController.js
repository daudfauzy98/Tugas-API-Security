import express from 'express'
import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import jwt from 'jsonwebtoken'
import User from './../models/user.js'
import Conf from './../utils/config.js'
import Jabatan from './../utils/jabatan.js'

import dotenv from 'dotenv'
dotenv.config()
const userRouter = express.Router()

userRouter.use(bodyParser.urlencoded({ extended: false }))
userRouter.use(bodyParser.json())

// Cek validasi token
userRouter.get('/validate', function(req, res) {
    // Header yang digunakan untuk mengambil token
    var token = req.headers['x-access-token']
    if (!token) 
        return res.status(401).send({ auth: false, message: 'No token provided!' })
    
    // Verifikasi token dengan JWT
    jwt.verify(token, Conf.secret, function(err, decoded) {
        if (err) 
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token!' })
    
      res.status(200).send(decoded)
    })
})

// Buat user baru
userRouter.post ('/signup', async (req, res) => {
    try {
        const { username, nama_belakang, password, jabatan } = req.body
        const user = await User.findOne({ username })
        
        if(user){
            res.status(201).json({ message: 'User sudah ada!' })
        } else {
            var saltRounds = 5
            const hashedPassword = await bcrypt.hash(password, saltRounds)
            
            // Jika saat input jabatan sesuai
            if(Jabatan.includes(jabatan)){
                const createdUser = new User({
                    "username": username,
                    "nama_belakang": nama_belakang,
                    "password": hashedPassword,
                    "jabatan": jabatan
                })
                const savedUser = await createdUser.save()
                res.status(201).json(savedUser)
                
            } else { // Jika saat input jabatan tidak sesuai
                res.status(201).json({
                    message: 'Jabatan tidak sesuai! Pilih jabatan: Bos, Manager, atau Kasir'
                })
            }
        }
    } catch (error) {
        res.status(500).json({ error: error })
    }
})

// Tampilkan semua user
userRouter.get('/show', async(req, res) => {
    const users = await User.find({})
    
    if(users && users.length !==0) {
        res.json(users)
    } else {
        res.status(404).json({ message: 'Users is empty' })
    }
})

// Tampilkan user berdasarkan id
userRouter.get('/:id', async(req, res) => {
    const user = await User.findById(req.params.id)

    if(user) {
        res.json(user)
    } else {
        res.status(404).json({ message: 'User not found!' })
    }
})


// Update jabatan Kasir dan Manager oleh Bos berdasarkan id mereka
userRouter.put('/update/:id', async(req, res) => {
    const { jabatanBaru } = req.body
    const user = await User.findById(req.params.id)

    // Header yang digunakan untuk mengambil token
    var token = req.headers['x-access-token']
    if (!token) 
        return res.status(401).send({ auth: false, message: 'No token provided!' })
    
    // Verifikasi token apakah sudah sesuai dengan saltcode
    jwt.verify(token, Conf.secret, async(err, decoded) => {
        if (err)
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token!' })
        
        // Ambil info jabatan user yang mengakses endpoint ini
        const jabatan = decoded.user.jabatan

        // Jika jabatan user yang mengakses endpoint ini adalah Bos
        if(jabatan == Jabatan[0]) {
            if (user) {
                user.jabatan = jabatanBaru
                
                const updatedUser = await user.save()
                res.json(updatedUser)
            } else {
                res.status(404).json({ message: 'User not found!' })
            }
        } else {
            res.status(404).json({ message: 'Tidak memiliki hak akses untuk merubah jabatan!' })
        }
    })
})

// Hapus user tertentu berdasarkan id
userRouter.delete('/delete/:id', async(req, res) => {
    const user = await User.findById(req.params.id)

    if(user) {
        await user.remove()
        res.json({ message: 'User success removed' })
    } else {
        res.status(404).json({ message: 'User not found!' })
    }
})

// Hapus semua user
userRouter.delete('/delete', async(req, res) => {
    const users = await User.find({})

    if(users && users.length !== 0){
        await User.remove()
        res.json({
            message: 'All user removed!'
        })
    } else {
        res.status(404).json({
            message: 'User not found!'
        })
    }
})

// Login untuk mendapatkan access token agar bisa melakukan kegiatan di Kasir
userRouter.post('/login', async(req, res) => {
    try {
        const { username, password } = req.body

        const currentUser = await new Promise((resolve, reject) => {
            User.find({ 'username': username }, (err, user) => {
                if(err)
                    reject(err);
                resolve(user);
            })
        })
        
        // Cek apakah ada username di database seperti yang di-inputkan?
        // Variabel currentUser berupa array karena User.find() mengembalikan nilai array
        // Dan elemen yang dipanggil harus index ke-0
        if(currentUser[0]){
            // Jika username terdaftar, cek apakah password yang di-inputkan benar
            bcrypt.compare(password, currentUser[0].password).then((result, err) => {
                if(result) {
                    // Jika ada error saat komparasi password
                    if (err) return res.status(500).send('There was a problem registering the user.')
                    
                    // Buat tokennya
                    const user = currentUser[0]
                    var token = jwt.sign({ user }, Conf.secret, {
                        expiresIn: 1800 // Token kadaluarsa dalam 30 menit
                    })
                    
                    res.status(200).send({ auth: true, 'status': 'Logged in!', token: token})
                } else {
                    res.status(201).json({ 'status': 'Wrong password!' })
                }
            })
        } else {
            res.status(201).json({ 'status': 'Username not found!' })
        }
    } catch (error) {
        res.status(500).json({ error: error});
    }
})

export default userRouter;