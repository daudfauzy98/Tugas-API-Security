import mongoose from 'mongoose'

const kasirSchema = mongoose.Schema({
    id: {
        type: String,
    },
    jabatan: {
        type: String,
    },
    transaksi: {
        type: String,
        required: true,
    },
    nominal: {
        type: Number,
    },
    total_saldo: {
        type: Number,
    }
}, {
    timestamps: true,
})

const Kasir = mongoose.model('Kasir', kasirSchema)

export default Kasir