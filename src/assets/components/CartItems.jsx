function CartItem({ item, onCartUpdate }) {

  const updateQuantity = async (newQuantity) => {

    if (newQuantity < 1) {
      return;
    }

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/cart/${item.cart_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity: Number(newQuantity),
          }),
        }
      );

      const data = await response.json();

      console.log("PUT response:", data);

      if (!response.ok) {
        alert(data.detail || "Unable to update cart");
        return;
      }

      await onCartUpdate();

    } catch (error) {

      console.error("Update cart error:", error);

    }
  };


  const removeItem = async () => {

    const confirmRemove = window.confirm(
      `Remove ${item.name} from your cart?`
    );

    if (!confirmRemove) {
      return;
    }

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/cart/${item.cart_id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      console.log("DELETE response:", data);

      if (!response.ok) {

        alert(
          data.detail || "Unable to remove item"
        );

        return;
      }

      await onCartUpdate();

    } catch (error) {

      console.error("Remove cart item error:", error);

      alert("Unable to connect to server.");

    }
  };


  return (
  

    <div className="cart-item">

      <img
  src={
    item.image?.startsWith("http")
      ? item.image
      : `/images/${item.image}`
  }
  alt={item.name}
/>

      <div className="cart-info">

        <h3>{item.name}</h3>

        <p>Brand: {item.brand}</p>

        <p>
          ${Number(item.price).toFixed(2)}
        </p>

      </div>

      <div className="cart-quantity">

        <button
          type="button"
          onClick={() =>
            updateQuantity(
              Number(item.quantity) - 1
            )
          }
          disabled={Number(item.quantity) <= 1}
        >
          -
        </button>

        <span>
          {item.quantity}
        </span>

        <button
          type="button"
          onClick={() =>
            updateQuantity(
              Number(item.quantity) + 1
            )
          }
        >
          +
        </button>

      </div>

      <h3>
        $
        {(
          Number(item.price) *
          Number(item.quantity)
        ).toFixed(2)}
      </h3>

      <button
        type="button"
        className="remove-btn"
        onClick={removeItem}
      >
        Remove
      </button>

    </div>

  );
}

export default CartItem;