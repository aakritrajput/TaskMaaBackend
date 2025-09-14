import multer from 'multer'

const storage = multer.diskStorage({
    destination: (_, _, cb) => {
        cb(null, "./public/temp")
    },
    filename: (_, file, cb) => {
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage,
})