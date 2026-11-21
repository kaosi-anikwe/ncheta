import { authorSchema } from "./author"
import { categorySchema } from "./category"
import { editorialSchema } from "./editorial"
import { navigationSettingsSchema } from "./navigationSettings"
import { bookSchema } from "./book"
import { storeSettingsSchema } from "./storeSettings"

export const schemaTypes = [
    authorSchema,
    categorySchema,
    editorialSchema,
    navigationSettingsSchema,
    bookSchema,
    storeSettingsSchema,
]
