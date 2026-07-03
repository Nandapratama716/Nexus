package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/domain"
)

type MenuHandler struct {
	menuUsecase domain.MenuUsecase
}

func NewMenuHandler(app fiber.Router, us domain.MenuUsecase) {
	handler := &MenuHandler{menuUsecase: us}
	
	menuGroup := app.Group("/api/v1/menus")
	menuGroup.Post("/", handler.Create)
	menuGroup.Get("/:id", handler.GetByID)
}

func (h *MenuHandler) Create(c *fiber.Ctx) error {
	var menu domain.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}
	
	if err := h.menuUsecase.CreateMenu(c.Context(), &menu); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(fiber.StatusCreated).JSON(menu)
}

func (h *MenuHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	menu, err := h.menuUsecase.GetMenu(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(menu)
}
