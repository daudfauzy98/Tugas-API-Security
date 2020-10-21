import express from 'express';
import Kasir from '../models/kasir.js';
//import User from '../models/user.js';
import Jabatan from '../utils/jabatan.js';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import Conf from '../utils/config.js';

const kasirRouter = express.Router();

// Menggunakan format JSON untuk parsing data
kasirRouter.use(bodyParser.urlencoded({ extended: false }));
kasirRouter.use(bodyParser.json());

// Memasukkan uang ke kasir
kasirRouter.post('/deposit', async(req, res) =>{
    try {
        const nominal = req.body;
        // Ambil record kasir paling akhir
        const kasirTerakhir = Kasir.findOne().sort({ field: -_id }).limit(1)
        // Set nilai awal kolom total_saldo pada database kasir
        const total_saldo = 0

        if (kasirTerakhir)     // Jika terdapat data kasir
            total_saldo = kasirTerakhir.total_saldo + nominal
                
        // Header yang digunakan untuk mengambil token
        var token = req.headers['x-access-token']
        if (!token) 
            return res.status(401).send({ auth: false, message: 'No token provided!' })
        
        // Verifikasi token apakah sudah sesuai dengan saltcode
        jwt.verify(token, Conf.secret, async(err, decoded) => {
            if (err) 
                return res.status(500).send({ auth: false, message: 'Failed to authenticate token!' })
            
            const id = decoded.user._id
            const jabatan = decoded.user.jabatan
            const transaksi = 'Deposit'

            const createdKasir = new Kasir({
                id,
                jabatan,
                transaksi,
                nominal,
                total_saldo,
            })

            const savedKasir = await createdKasir.save()
            res.status(201).json(savedKasir)
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({error: err})
    }
})

// Melihat semua aktifitas kasir dan cek total saldo
kasirRouter.get('/inquiry', async(req, res) => {
    const daftarKasir = await Kasir.find({});
    
    // Header yang digunakan untuk mengambil token
    var token = req.headers['x-access-token'];
    if (!token)
        return res.status(401).send({ auth: false, message: 'No token provided!' })
    
    // Verifikasi token apakah sudah sesuai dengan saltcode
    jwt.verify(token, Conf.secret, async(err, decoded) => {
        if (err)
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token!' });
        
        const jabatan = decoded.user.jabatan;

        // if(jabatan == Jabatan[0] || jabatan == Jabatan[1])
        if(jabatan != Jabatan[2]) { // Jika jabatan bukan kasir
            if(daftarKasir && daftarKasir.length !==0) {
                res.json(daftarKasir)
            } else {
                res.status(404).json({ message: 'Transaksi tidak ditemukan' })
            }
        } else { // Jika jabatan kasir
            res.status(201).json('Tidak memiliki hak akses untuk melihat saldo!')
        }
    })
})

// Bos ambil uang berdasarkan data kasir terakhir (untuk mengambil saldo)
kasirRouter.put('/withdrawal/', async(req, res) => {
    const { withdrawal } = req.body;
    const kasirTerakhir = Kasir.findOne().sort({ field: -_id }).limit(1)
    
    // Header yang digunakan untuk mengambil token
    var token = req.headers['x-access-token'];
    if (!token) 
        return res.status(401).send({ auth: false, message: 'No token provided!' })
    
    // Verifikasi token apakah sudah sesuai dengan saltcode
    jwt.verify(token, Conf.secret, async(err, decoded) => {
        if (err)
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token!' });
                        
        const jabatan = decoded.user.jabatan;

        if(jabatan == Jabatan[0]) {     // Jika jabatan = Bos
            if(kasirTerakhir){
                kasirTerakhir.transaksi = 'Withdrawal'
                kasirTerakhir.total_saldo = kasirTerakhir.total_saldo - withdrawal
                
                const updatedKasir = await kasirTerakhir.save();
                res.status(200).send(updatedKasir);
            } else {
                res.status(404).json({ message: 'Transaksi tidak ditemukan' })
            }
        } else {
            res.status(404).json({ message: 'Tidak memiliki hak akses' })
        }
    })
})

export default kasirRouter