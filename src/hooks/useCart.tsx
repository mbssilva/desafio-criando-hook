import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem( '@RocketShoes:cart' )

        if (storagedCart) {
          return JSON.parse(storagedCart);
        }

        return [];
    });

    const prevCartRef = useRef<Product[]>()

    useEffect(() => {
        prevCartRef.current = cart
    })

    const cartPreviousValue = prevCartRef.current ?? cart

    useEffect( () => {
        if ( cartPreviousValue !== cart ) {
            localStorage.setItem( '@RocketShoes:cart', JSON.stringify( cart ) )
        }
    }, [cart, cartPreviousValue])

    const addProduct = async (productId: number) => {
        try {
            const updatedCart = [...cart]
            const isProductExists = updatedCart.find( product => product.id === productId )

            const stock = await api.get( `/stock/${ productId }` )
            const stockAmount = stock.data.amount // Qnt de produto no stock
            const currentAmount = isProductExists ? isProductExists.amount : 0 // Qtd do produto no carrinho
            const amount = currentAmount + 1 // Qtd desejada

            if ( amount > stockAmount ) { // Se a quantidade desejada for maior que o estoque da loja

                toast.error( 'Quantidade solicitada fora de estoque' )
                return
            }

            if ( isProductExists )  { // se existir o produto no cart
                isProductExists.amount = amount
            } else {
                const product = await api.get(`/products/${ productId }` )

                const newProduct = {
                    ...product.data,
                    amount: 1
                }

                updatedCart.push( newProduct )
            }

            setCart( updatedCart )

            

        } catch {
            toast.error('Erro na adição do produto')
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const updatedCart = [...cart]
            const productIndex = updatedCart.findIndex( product => product.id === productId )

            if ( productIndex >= 0 ) { // se econtrou um produto com o mesmo id do parametro, retorna o index dele

                updatedCart.splice( productIndex, 1 )
                setCart( updatedCart )
                
            } else {
                throw Error()
            }
        } catch {
            toast.error('Erro na remoção do produto')
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            if ( amount <= 0 ) {
                return
            }

            const stock = await api.get(`/stock/${ productId}`)
            const stockAmount = stock.data.amount

            if ( amount > stockAmount ) {
                toast.error('Quantidade solicitada fora de estoque')
                return
            }

            const updatedCart = [...cart]
            const productExists = updatedCart.find( product => product.id === productId )

            if ( productExists ) {
                productExists.amount = amount
                setCart( updatedCart)
                
            } else {
                throw Error()
            }
        } catch {
            toast.error('Erro na alteração de quantidade do produto')
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
