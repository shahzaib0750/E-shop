function CartItem({ item }) {

  return (

    <div className="cart-item">

      <img src={item.image} alt={item.name} />

      <div className="cart-info">

        <h3>{item.name}</h3>

        <p>${item.price}</p>

      </div>

      <div className="cart-quantity">

        <button>-</button>

        <span>{item.quantity}</span>

        <button>+</button>

      </div>

      <h3>${item.price * item.quantity}</h3>

      <button className="remove-btn">
        Remove
      </button>

    </div>

  );
}

export default CartItem;